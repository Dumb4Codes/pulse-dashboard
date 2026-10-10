import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE } from '@/lib/auth';
import { getSessionEmail } from '@/lib/server/authServer';

/**
 * Auth gate (Next 16 renamed `middleware` to `proxy`).
 * - Valid `pulse_session`: everything passes, except /login which bounces to /.
 * - No / invalid cookie: pages redirect to /login (dropping any stale cookie),
 *   API routes answer 401 JSON so the NewsAPI/TMDB-backed handlers can't be used anonymously.
 * Fails closed: in production without AUTH_SECRET no cookie can validate.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const email = await getSessionEmail(request);

  if (pathname === '/login' || pathname.startsWith('/login/')) {
    return email ? NextResponse.redirect(new URL('/', request.url)) : NextResponse.next();
  }

  if (email) return NextResponse.next();

  if (pathname === '/api' || pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }

  const redirect = NextResponse.redirect(new URL('/login', request.url));
  if (request.cookies.has(COOKIE)) redirect.cookies.delete(COOKIE);
  return redirect;
}

/**
 * Runs on everything except the auth endpoints (they must work without a session),
 * Next internals and static assets. /login is deliberately INCLUDED so a signed-in
 * user visiting it is redirected to /; the "let anonymous users through" rule lives in the function.
 */
export const config = {
  matcher: [
    '/((?!api/auth(?:/|$)|_next/static|_next/image|favicon\\.ico$|.*\\.(?:svg|png|jpe?g|gif|webp|avif|ico|woff2?|txt|xml|webmanifest)$).*)',
  ],
};
