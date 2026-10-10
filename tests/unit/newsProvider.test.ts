import { getNews } from '@/lib/server/newsProvider';
import { parseParams } from '@/lib/params';
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it('uses mock when NEWS_API_KEY is absent', async () => { vi.stubEnv('NEWS_API_KEY', ''); expect((await getNews(parseParams(new URLSearchParams()))).source).toBe('mock'); });
it('maps NewsAPI articles to ContentItem', async () => {
  vi.stubEnv('NEWS_API_KEY', 'k');
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ status:'ok', totalResults:1, articles:[{ title:'T', description:'D', url:'https://x.test/a', urlToImage:'https://x.test/i.jpg', publishedAt:'2026-01-01T00:00:00Z', source:{ name:'S' }, author:'A' }] }))));
  const r = await getNews(parseParams(new URLSearchParams('categories=sports')));
  expect(r.source).toBe('live'); expect(r.items[0]).toMatchObject({ type:'news', category:'sports', title:'T', source:'S' });
});
it('falls back to mock on HTTP 429', async () => {
  vi.stubEnv('NEWS_API_KEY', 'k'); vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 429 })));
  expect((await getNews(parseParams(new URLSearchParams()))).source).toBe('mock'); });
it('falls back to mock on malformed JSON', async () => {
  vi.stubEnv('NEWS_API_KEY', 'k'); vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>')));
  expect((await getNews(parseParams(new URLSearchParams()))).source).toBe('mock'); });
