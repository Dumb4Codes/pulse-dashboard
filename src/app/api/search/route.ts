import { NextRequest, NextResponse } from 'next/server';
import { CATEGORIES } from '@/lib/categories';
import { parseParams } from '@/lib/params';
import { getMovies } from '@/lib/server/moviesProvider';
import { getNews } from '@/lib/server/newsProvider';
import { getSocial } from '@/lib/server/socialProvider';

export const dynamic = 'force-dynamic';

const TOP = 5;

export async function GET(req: NextRequest) {
  const { q } = parseParams(req.nextUrl.searchParams);
  if (q.length < 2) return NextResponse.json({ news: [], movies: [], social: [] });
  const params = { page: 1, categories: [...CATEGORIES], q, tags: [] };
  const [news, movies, social] = await Promise.all([getNews(params), getMovies(params), getSocial(params)]);
  return NextResponse.json({
    news: news.items.slice(0, TOP),
    movies: movies.items.slice(0, TOP),
    social: social.items.slice(0, TOP),
  });
}
