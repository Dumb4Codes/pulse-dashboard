import { getNews } from '@/lib/server/newsProvider';
import { parseParams } from '@/lib/params';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
const P = (s = '') => parseParams(new URLSearchParams(s));
const article = (n: number, over: Record<string, unknown> = {}) => ({
  title: `Story ${n}`, description: 'D', url: `https://www.same-host.test/news/2026/01/story-${n}`,
  urlToImage: `https://www.same-host.test/img/${n}.jpg`, publishedAt: '2026-01-01T00:00:00Z', source: { name: 'S' }, ...over,
});
const stub = (articles: unknown[]) => {
  const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(async () => new Response(JSON.stringify({ status: 'ok', articles })));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

it('gives articles from the same host distinct ids', async () => {
  vi.stubEnv('NEWS_API_KEY', 'k');
  stub([article(1), article(2), article(3)]);
  const r = await getNews(P('categories=technology'));
  expect(new Set(r.items.map(i => i.id)).size).toBe(3);
});

it('skips [Removed] and image-less articles and sends the API key header', async () => {
  vi.stubEnv('NEWS_API_KEY', 'secret');
  const fetchMock = stub([article(1), article(2, { title: '[Removed]' }), article(3, { urlToImage: null })]);
  const r = await getNews(P('categories=health'));
  expect(r.items.map(i => i.title)).toEqual(['Story 1']);
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toContain('/top-headlines?country=us&category=health');
  expect((init.headers as Record<string, string>)['X-Api-Key']).toBe('secret');
});

it('uses /everything when q is set', async () => {
  vi.stubEnv('NEWS_API_KEY', 'k');
  const fetchMock = stub([article(1)]);
  await getNews(P('q=chips%20%26%20ai'));
  expect(fetchMock.mock.calls[0][0]).toContain('/everything?q=chips%20%26%20ai&pageSize=9');
});

it('queries a shared upstream category once for finance + business, capping the page at 9 items', async () => {
  vi.stubEnv('NEWS_API_KEY', 'k');
  const fetchMock = stub(Array.from({ length: 12 }, (_, n) => article(n)));
  const r = await getNews(P('categories=finance,business'));
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(r.items).toHaveLength(9);
  expect(r.items[0].category).toBe('finance');
});

it('ends pagination at the last page or when upstream is empty', async () => {
  vi.stubEnv('NEWS_API_KEY', 'k');
  stub([article(1)]);
  expect((await getNews(P('categories=science&page=5'))).nextPage).toBeNull();
  stub([]);
  expect((await getNews(P('categories=science&page=2'))).nextPage).toBeNull();
});
