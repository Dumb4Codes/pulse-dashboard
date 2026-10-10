import { NextRequest, NextResponse } from 'next/server';
import { parseParams } from '@/lib/params';
import { getMovies } from '@/lib/server/moviesProvider';

export async function GET(req: NextRequest) {
  const page = await getMovies(parseParams(req.nextUrl.searchParams));
  return NextResponse.json(page, { headers: { 'X-Data-Source': page.source } });
}
