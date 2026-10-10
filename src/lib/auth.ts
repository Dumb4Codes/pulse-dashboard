/**
 * Mock authentication primitives.
 *
 * Web Crypto only (`crypto.subtle`), so this module runs unchanged on the Node runtime
 * (route handlers, proxy) and in the browser. It holds no secrets: the signing secret is
 * resolved by `src/lib/server/authServer.ts` and passed in by the caller.
 *
 * Session token format: `${base64url(email)}.${base64url(HMAC-SHA-256(payload, secret))}`
 * where `payload` is the first segment. There is deliberately no expiry claim; the cookie's
 * `maxAge` bounds the session. This is a mock gate for a demo app, not a production identity
 * system.
 */

export const COOKIE = 'pulse_session';

export const DEMO_EMAIL = 'demo@pulse.dev';
export const DEMO_PASSWORD = 'pulse123';

export const MIN_PASSWORD_LENGTH = 6;
export const MAX_PASSWORD_LENGTH = 128;
export const MAX_EMAIL_LENGTH = 254;

/** Cookie values above this are never legitimate (browsers cap cookies at ~4 KB). */
const MAX_TOKEN_LENGTH = 1024;

/** Error keys returned by {@link validateCredentials}; also the i18n keys the login UI maps. */
export type AuthErrorKey = 'invalid' | 'email' | 'password';
export type AuthMode = 'login' | 'signup';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Returns null for anything that is not valid base64url. */
function fromBase64Url(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(value)) return null;
  try {
    const b64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

async function hmac(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return toBase64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(payload))));
}

/** Constant-time-ish comparison: always walks the full length once lengths are equal. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signSession(email: string, secret: string): Promise<string> {
  if (!email) throw new Error('signSession: email must not be empty');
  if (!secret) throw new Error('signSession: secret must not be empty');
  const payload = toBase64Url(encoder.encode(email));
  return `${payload}.${await hmac(payload, secret)}`;
}

/** Returns the signed-in email, or null for a missing, malformed, tampered or foreign token. */
export async function verifySession(token: string | undefined, secret: string): Promise<string | null> {
  if (!token || !secret || token.length > MAX_TOKEN_LENGTH) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  if (!payload || !signature) return null;
  try {
    if (!safeEqual(await hmac(payload, secret), signature)) return null;
    const bytes = fromBase64Url(payload);
    if (!bytes) return null;
    const email = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return email || null;
  } catch {
    return null;
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  const value = email.trim();
  return value.length > 0 && value.length <= MAX_EMAIL_LENGTH && EMAIL_RE.test(value);
}

/**
 * Mock credential check. There is no user database:
 * - `login` only accepts the demo account (`demo@pulse.dev` / `pulse123`);
 * - `signup` accepts any well-formed email and a password of 6 to 128 characters.
 * Returns an error key (see {@link AuthErrorKey}) or null when the credentials are acceptable.
 */
export function validateCredentials(mode: AuthMode, email: string, password: string): AuthErrorKey | null {
  if (mode === 'login') {
    const ok = safeEqual(normalizeEmail(email), DEMO_EMAIL) && safeEqual(password, DEMO_PASSWORD);
    return ok ? null : 'invalid';
  }
  if (!isValidEmail(email)) return 'email';
  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) return 'password';
  return null;
}
