import { NextRequest } from 'next/server';
import { POST as login } from '@/app/api/auth/login/route';
import { POST as logout } from '@/app/api/auth/logout/route';
import { GET as session } from '@/app/api/auth/session/route';
import { proxy } from '@/proxy';
import { COOKIE, signSession } from '@/lib/auth';
import { DEV_SECRET, SESSION_MAX_AGE, getAuthSecret } from '@/lib/server/authServer';

const URL_BASE = 'http://localhost:3000';
const post = (path: string, body: unknown) =>
  new NextRequest(`${URL_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
const get = (path: string, cookie?: string) =>
  new NextRequest(`${URL_BASE}${path}`, { headers: cookie ? { cookie: `${COOKIE}=${cookie}` } : {} });

afterEach(() => vi.unstubAllEnvs());

describe('getAuthSecret', () => {
  it('uses AUTH_SECRET when set', () => {
    vi.stubEnv('AUTH_SECRET', '  real-secret ');
    expect(getAuthSecret()).toBe('real-secret');
  });
  it('falls back to the dev secret outside production', () => {
    vi.stubEnv('AUTH_SECRET', '');
    vi.stubEnv('NODE_ENV', 'development');
    expect(getAuthSecret()).toBe(DEV_SECRET);
  });
  it('is null in production without AUTH_SECRET (fail closed)', () => {
    vi.stubEnv('AUTH_SECRET', '');
    vi.stubEnv('NODE_ENV', 'production');
    expect(getAuthSecret()).toBeNull();
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(() => { vi.stubEnv('AUTH_SECRET', 'route-test-secret-route-test-secret'); });

  it('sets an httpOnly, SameSite=Lax, 7-day pulse_session cookie for the demo account', async () => {
    const res = await login(post('/api/auth/login', { mode: 'login', email: 'demo@pulse.dev', password: 'pulse123' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ email: 'demo@pulse.dev' });
    const cookie = res.cookies.get(COOKIE);
    expect(cookie?.value).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(cookie).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/', maxAge: SESSION_MAX_AGE });
    expect(SESSION_MAX_AGE).toBe(604800);
  });

  it('marks the cookie Secure in production only', async () => {
    const body = { mode: 'login', email: 'demo@pulse.dev', password: 'pulse123' };
    vi.stubEnv('NODE_ENV', 'production');
    expect((await login(post('/api/auth/login', body))).cookies.get(COOKIE)?.secure).toBe(true);
    vi.stubEnv('NODE_ENV', 'development');
    expect((await login(post('/api/auth/login', body))).cookies.get(COOKIE)?.secure).toBeFalsy();
  });

  it('401 {error:invalid} with no cookie for a wrong password', async () => {
    const res = await login(post('/api/auth/login', { mode: 'login', email: 'demo@pulse.dev', password: 'nope' }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'invalid' });
    expect(res.cookies.get(COOKIE)).toBeUndefined();
  });

  it('signup: 400 with the field key on bad input, 200 + normalized email when valid', async () => {
    const badEmail = await login(post('/api/auth/login', { mode: 'signup', email: 'nope', password: 'longenough' }));
    expect(badEmail.status).toBe(400);
    expect(await badEmail.json()).toEqual({ error: 'email' });
    const badPw = await login(post('/api/auth/login', { mode: 'signup', email: 'new@pulse.dev', password: '123' }));
    expect(badPw.status).toBe(400);
    expect(await badPw.json()).toEqual({ error: 'password' });
    const ok = await login(post('/api/auth/login', { mode: 'signup', email: ' New@Pulse.dev ', password: 'longenough' }));
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ email: 'new@pulse.dev' });
  });

  it('400 bad_request for malformed JSON, wrong shapes or unknown modes (never 500)', async () => {
    for (const body of ['{not json', 'null', '[]', '"str"', { mode: 'admin', email: 'a@b.co', password: 'x' }, { mode: 'login', email: 1, password: 2 }]) {
      const res = await login(post('/api/auth/login', body));
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'bad_request' });
    }
  });

  it('500 server_misconfigured (with a clear log) when AUTH_SECRET is missing in production', async () => {
    vi.stubEnv('AUTH_SECRET', '');
    vi.stubEnv('NODE_ENV', 'production');
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await login(post('/api/auth/login', { mode: 'login', email: 'demo@pulse.dev', password: 'pulse123' }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'server_misconfigured' });
    expect(res.cookies.get(COOKIE)).toBeUndefined();
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('AUTH_SECRET'));
    spy.mockRestore();
  });
});

describe('POST /api/auth/logout', () => {
  it('clears the cookie', async () => {
    const res = await logout();
    expect(res.status).toBe(200);
    const cookie = res.cookies.get(COOKIE);
    expect(cookie?.value).toBe('');
    expect(cookie?.maxAge).toBe(0);
  });
});

describe('GET /api/auth/session', () => {
  beforeEach(() => { vi.stubEnv('AUTH_SECRET', 'route-test-secret-route-test-secret'); });

  it('200 {email} for a valid cookie', async () => {
    const token = await signSession('demo@pulse.dev', 'route-test-secret-route-test-secret');
    const res = await session(get('/api/auth/session', token));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ email: 'demo@pulse.dev' });
  });

  it('401 with no cookie, a forged cookie, or a cookie signed with another secret', async () => {
    expect((await session(get('/api/auth/session'))).status).toBe(401);
    expect((await session(get('/api/auth/session', 'garbage'))).status).toBe(401);
    const foreign = await signSession('demo@pulse.dev', 'some-other-secret-some-other-secret');
    expect((await session(get('/api/auth/session', foreign))).status).toBe(401);
  });
});

describe('proxy (auth gate)', () => {
  const SECRET = 'route-test-secret-route-test-secret';
  beforeEach(() => { vi.stubEnv('AUTH_SECRET', SECRET); });

  it('redirects unauthenticated page requests to /login', async () => {
    const res = await proxy(get('/'));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get('location') ?? '').pathname).toBe('/login');
    const trending = await proxy(get('/trending'));
    expect(new URL(trending.headers.get('location') ?? '').pathname).toBe('/login');
  });

  it('drops a forged cookie while redirecting', async () => {
    const res = await proxy(get('/', 'forged.value'));
    expect(res.status).toBe(307);
    expect(res.cookies.get(COOKIE)?.value).toBe('');
  });

  it('answers 401 JSON (no redirect) for unauthenticated API requests', async () => {
    for (const path of ['/api/news?page=1', '/api/movies', '/api/social', '/api/search?q=ai', '/api/stream']) {
      const res = await proxy(get(path));
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: 'unauthenticated' });
    }
  });

  it('lets anonymous users reach /login', async () => {
    const res = await proxy(get('/login'));
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  it('lets authenticated requests through and bounces /login to /', async () => {
    const token = await signSession('demo@pulse.dev', SECRET);
    const page = await proxy(get('/', token));
    expect(page.status).toBe(200);
    expect(page.headers.get('location')).toBeNull();
    const api = await proxy(get('/api/news', token));
    expect(api.status).toBe(200);
    const login = await proxy(get('/login', token));
    expect(login.status).toBe(307);
    expect(new URL(login.headers.get('location') ?? '').pathname).toBe('/');
  });

  it('fails closed in production without AUTH_SECRET', async () => {
    const token = await signSession('demo@pulse.dev', SECRET);
    vi.stubEnv('AUTH_SECRET', '');
    vi.stubEnv('NODE_ENV', 'production');
    expect((await proxy(get('/api/news', token))).status).toBe(401);
    expect((await proxy(get('/', token))).status).toBe(307);
  });
});
