import { NextRequest } from 'next/server';
import { GET as news } from '@/app/api/news/route';
import { GET as movies } from '@/app/api/movies/route';
import { GET as social } from '@/app/api/social/route';
import { GET as search } from '@/app/api/search/route';

const req = (path: string) => new NextRequest(`http://localhost:3000${path}`);
beforeEach(() => { vi.stubEnv('NEWS_API_KEY', ''); vi.stubEnv('TMDB_API_KEY', ''); });
afterEach(() => vi.unstubAllEnvs());

it.each([['news', news], ['movies', movies], ['social', social]] as const)('/api/%s returns a mock Page with X-Data-Source', async (name, GET) => {
  const res = await GET(req(`/api/${name}?page=2`));
  expect(res.status).toBe(200);
  expect(res.headers.get('X-Data-Source')).toBe('mock');
  const body = await res.json();
  expect(body.source).toBe('mock');
  expect(body.items).toHaveLength(9);
});

it('/api/search returns empty arrays for q shorter than 2 chars (incl. whitespace-only)', async () => {
  for (const q of ['', 'a', '%20%20%20']) {
    expect(await (await search(req(`/api/search?q=${q}`))).json()).toEqual({ news: [], movies: [], social: [] });
  }
});

it('/api/search returns at most 5 per type and survives hostile input', async () => {
  const body = await (await search(req('/api/search?q=ai'))).json();
  for (const k of ['news', 'movies', 'social']) {
    expect(body[k].length).toBeGreaterThan(0);
    expect(body[k].length).toBeLessThanOrEqual(5);
  }
  const hostile = await search(req(`/api/search?q=${encodeURIComponent(`<script>(.*)[\\${'x'.repeat(500)}`)}`));
  expect(hostile.status).toBe(200);
});
