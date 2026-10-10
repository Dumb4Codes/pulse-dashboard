import { NextResponse } from 'next/server';
import { sessionCookie } from '@/lib/server/authServer';

export const dynamic = 'force-dynamic';

/** POST /api/auth/logout: clears pulse_session. Works with or without a valid session. */
export async function POST() {
  const res = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  res.cookies.set(sessionCookie('', 0));
  return res;
}
