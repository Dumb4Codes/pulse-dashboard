import { NextRequest, NextResponse } from 'next/server';
import { getAuthSecret, getSessionEmail, logMissingSecret } from '@/lib/server/authServer';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

/** GET /api/auth/session: 200 { email } for a valid pulse_session cookie, otherwise 401. */
export async function GET(req: NextRequest) {
  if (!getAuthSecret()) {
    logMissingSecret('GET /api/auth/session');
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500, headers: NO_STORE });
  }
  const email = await getSessionEmail(req);
  if (!email) return NextResponse.json({ error: 'unauthenticated' }, { status: 401, headers: NO_STORE });
  return NextResponse.json({ email }, { headers: NO_STORE });
}
