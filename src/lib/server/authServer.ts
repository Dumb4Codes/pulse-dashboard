import type { NextRequest } from 'next/server';
import { COOKIE, verifySession } from '@/lib/auth';

/**
 * Development-only fallback so `npm run dev` works with zero configuration.
 * It is public (it lives in the repo) and is NEVER used when NODE_ENV is "production".
 */
export const DEV_SECRET = 'pulse-dev-only-secret-never-use-in-production';

/** Session lifetime: 7 days, in seconds (cookie `maxAge`). */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

/**
 * Resolves the HMAC secret used to sign `pulse_session`.
 * - `AUTH_SECRET` when set (non-blank);
 * - the documented {@link DEV_SECRET} outside production;
 * - `null` in production without `AUTH_SECRET` (callers must fail closed).
 */
export function getAuthSecret(): string | null {
  const configured = process.env.AUTH_SECRET?.trim();
  if (configured) return configured;
  return process.env.NODE_ENV === 'production' ? null : DEV_SECRET;
}

/** Clear, greppable log line for the "production without AUTH_SECRET" misconfiguration. */
export function logMissingSecret(scope: string): void {
  console.error(
    `[pulse/auth] ${scope}: AUTH_SECRET is not set and NODE_ENV is "production". ` +
      'Set AUTH_SECRET to a long random string (see .env.example). Refusing to issue or accept sessions.',
  );
}

/** Attributes for the session cookie. `value: ''` + `maxAge: 0` clears it. */
export function sessionCookie(value: string, maxAge: number = SESSION_MAX_AGE) {
  return {
    name: COOKIE,
    value,
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge,
  };
}

/** Email of the signed-in user for this request, or null (also null when no secret is available). */
export async function getSessionEmail(req: NextRequest): Promise<string | null> {
  const secret = getAuthSecret();
  if (!secret) return null;
  return verifySession(req.cookies.get(COOKIE)?.value, secret);
}
