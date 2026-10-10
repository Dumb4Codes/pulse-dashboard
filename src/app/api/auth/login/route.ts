import { NextRequest, NextResponse } from 'next/server';
import { normalizeEmail, signSession, validateCredentials, type AuthMode } from '@/lib/auth';
import { getAuthSecret, logMissingSecret, sessionCookie } from '@/lib/server/authServer';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

interface LoginBody { mode: AuthMode; email: string; password: string }

function parseBody(value: unknown): LoginBody | null {
  if (typeof value !== 'object' || value === null) return null;
  const { mode, email, password } = value as Record<string, unknown>;
  if (mode !== 'login' && mode !== 'signup') return null;
  if (typeof email !== 'string' || typeof password !== 'string') return null;
  return { mode, email, password };
}

/**
 * POST /api/auth/login  body: { mode: 'login' | 'signup', email, password }
 * 200 { email } + Set-Cookie pulse_session  |  401 { error: 'invalid' }
 * 400 { error: 'email' | 'password' | 'bad_request' } (signup validation / malformed body)
 * 500 { error: 'server_misconfigured' } when AUTH_SECRET is missing in production.
 */
export async function POST(req: NextRequest) {
  const secret = getAuthSecret();
  if (!secret) {
    logMissingSecret('POST /api/auth/login');
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500, headers: NO_STORE });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400, headers: NO_STORE });
  }
  const body = parseBody(raw);
  if (!body) return NextResponse.json({ error: 'bad_request' }, { status: 400, headers: NO_STORE });

  const error = validateCredentials(body.mode, body.email, body.password);
  if (error) {
    const status = error === 'invalid' ? 401 : 400;
    return NextResponse.json({ error }, { status, headers: NO_STORE });
  }

  const email = normalizeEmail(body.email);
  const res = NextResponse.json({ email }, { headers: NO_STORE });
  res.cookies.set(sessionCookie(await signSession(email, secret)));
  return res;
}
