import { NextRequest, NextResponse } from 'next/server';
import { parseParams } from '@/lib/params';
import { getSocial } from '@/lib/server/socialProvider';

export async function GET(req: NextRequest) {
  const page = await getSocial(parseParams(req.nextUrl.searchParams));
  return NextResponse.json(page, { headers: { 'X-Data-Source': page.source } });
}
