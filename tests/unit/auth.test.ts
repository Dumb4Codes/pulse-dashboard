import { COOKIE, signSession, validateCredentials, verifySession } from '@/lib/auth';

const SECRET = 'unit-test-secret-unit-test-secret';
const EMAIL = 'demo@pulse.dev';

describe('session token (Web Crypto HMAC-SHA-256)', () => {
  it('uses the exact cookie name', () => {
    expect(COOKIE).toBe('pulse_session');
  });

  it('sign -> verify returns the email', async () => {
    const token = await signSession(EMAIL, SECRET);
    expect(await verifySession(token, SECRET)).toBe(EMAIL);
  });

  it('has the shape base64url(email).hmac with url-safe characters only', async () => {
    const token = await signSession(EMAIL, SECRET);
    const parts = token.split('.');
    expect(parts).toHaveLength(2);
    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/'))).toBe(EMAIL);
  });

  it('is deterministic for the same email + secret and differs per email', async () => {
    expect(await signSession(EMAIL, SECRET)).toBe(await signSession(EMAIL, SECRET));
    expect(await signSession('other@pulse.dev', SECRET)).not.toBe(await signSession(EMAIL, SECRET));
  });

  it('round-trips non-ASCII and plus-addressed emails', async () => {
    for (const email of ['jörg+news@pulse.dev', 'छात्र@pulse.dev', 'a.b+c_d-e@sub.pulse.dev']) {
      expect(await verifySession(await signSession(email, SECRET), SECRET)).toBe(email);
    }
  });

  it('rejects a tampered payload (swapped email, original signature)', async () => {
    const token = await signSession(EMAIL, SECRET);
    const [, sig] = token.split('.');
    const forgedPayload = btoa('admin@pulse.dev').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
    expect(await verifySession(`${forgedPayload}.${sig}`, SECRET)).toBeNull();
  });

  it('rejects a tampered signature', async () => {
    const token = await signSession(EMAIL, SECRET);
    const flipped = token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A');
    expect(await verifySession(flipped, SECRET)).toBeNull();
    expect(await verifySession(token.slice(0, -2), SECRET)).toBeNull();
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await signSession(EMAIL, SECRET);
    expect(await verifySession(token, 'a-different-secret-a-different-secret')).toBeNull();
  });

  it('returns null for undefined, empty and garbage tokens (never throws)', async () => {
    for (const bad of [undefined, '', '.', '..', 'garbage', 'a.b.c', '!!!.???', '%%%.%%%', 'x'.repeat(5000)]) {
      expect(await verifySession(bad, SECRET)).toBeNull();
    }
  });

  it('returns null (not a throw) for an empty secret on verify', async () => {
    const token = await signSession(EMAIL, SECRET);
    expect(await verifySession(token, '')).toBeNull();
  });

  it('refuses to sign with an empty secret or an empty email', async () => {
    await expect(signSession(EMAIL, '')).rejects.toThrow();
    await expect(signSession('', SECRET)).rejects.toThrow();
  });
});

describe('validateCredentials', () => {
  it('accepts the demo account on login', () => {
    expect(validateCredentials('login', 'demo@pulse.dev', 'pulse123')).toBeNull();
  });

  it('treats the demo email as case-insensitive and ignores surrounding whitespace', () => {
    expect(validateCredentials('login', '  Demo@Pulse.dev ', 'pulse123')).toBeNull();
  });

  it("returns 'invalid' for a wrong password, unknown email or empty input on login", () => {
    expect(validateCredentials('login', 'demo@pulse.dev', 'wrong')).toBe('invalid');
    expect(validateCredentials('login', 'demo@pulse.dev', 'PULSE123')).toBe('invalid');
    expect(validateCredentials('login', 'someone@else.com', 'pulse123')).toBe('invalid');
    expect(validateCredentials('login', '', '')).toBe('invalid');
  });

  it("signup: bad email -> 'email', short password -> 'password', valid -> null", () => {
    expect(validateCredentials('signup', 'not-an-email', 'longenough')).toBe('email');
    expect(validateCredentials('signup', 'a@b', 'longenough')).toBe('email');
    expect(validateCredentials('signup', '', 'longenough')).toBe('email');
    expect(validateCredentials('signup', 'new@pulse.dev', '12345')).toBe('password');
    expect(validateCredentials('signup', 'new@pulse.dev', '')).toBe('password');
    expect(validateCredentials('signup', 'new@pulse.dev', '123456')).toBeNull();
  });

  it('signup checks the email before the password', () => {
    expect(validateCredentials('signup', 'bad', '1')).toBe('email');
  });

  it('signup rejects absurdly long inputs', () => {
    expect(validateCredentials('signup', `${'a'.repeat(250)}@pulse.dev`, 'longenough')).toBe('email');
    expect(validateCredentials('signup', 'new@pulse.dev', 'x'.repeat(200))).toBe('password');
  });
});
