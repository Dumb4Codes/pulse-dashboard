import { NextRequest, NextResponse } from 'next/server';
import { parseParams } from '@/lib/params';
import { getNews } from '@/lib/server/newsProvider';

export async function GET(req: NextRequest) {
  const page = await getNews(parseParams(req.nextUrl.searchParams));
  return NextResponse.json(page, { headers: { 'X-Data-Source': page.source } });
}
