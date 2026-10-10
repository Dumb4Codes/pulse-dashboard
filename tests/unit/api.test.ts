import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { makeStore } from '@/store';
import { api } from '@/store/api';
import type { Page } from '@/lib/types';

const mk = (id: string) => ({ id, type:'news', category:'sports', title:id, description:'', image:'', url:'', source:'', publishedAt:'', score:1 }) as const;
const pages: Record<string, Page> = {
  '1': { items: [mk('a'), mk('b')], nextPage: 2, source: 'mock' },
  '2': { items: [mk('b'), mk('c')], nextPage: null, source: 'live' },
};
const seen: URL[] = [];
const server = setupServer(
  http.get('http://localhost:3000/api/news', ({ request }) => {
    const url = new URL(request.url); seen.push(url);
    return HttpResponse.json(pages[url.searchParams.get('page') ?? '1']);
  }),
  http.get('http://localhost:3000/api/search', ({ request }) =>
    HttpResponse.json({ news: [mk(new URL(request.url).searchParams.get('q') ?? '')], movies: [], social: [] })),
);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => { server.resetHandlers(); seen.length = 0; });
afterAll(() => server.close());

const args = { categories: ['sports' as const, 'health' as const] };

it('sends page + comma-joined categories', async () => {
  const store = makeStore();
  await store.dispatch(api.endpoints.getNews.initiate({ ...args, page: 1 }));
  expect(seen[0].searchParams.get('page')).toBe('1');
  expect(seen[0].searchParams.get('categories')).toBe('sports,health'); });

it('merges pages into one cache entry, deduping repeated ids', async () => {
  const store = makeStore();
  await store.dispatch(api.endpoints.getNews.initiate({ ...args, page: 1 }));
  await store.dispatch(api.endpoints.getNews.initiate({ ...args, page: 2 }));
  const data = api.endpoints.getNews.select({ ...args, page: 2 })(store.getState()).data as Page;
  expect(data.items.map(i => i.id)).toEqual(['a', 'b', 'c']);
  expect(data.nextPage).toBeNull(); expect(data.source).toBe('live'); });

it('page 1 replaces any accumulated data (refresh)', async () => {
  const store = makeStore();
  await store.dispatch(api.endpoints.getNews.initiate({ ...args, page: 1 }));
  await store.dispatch(api.endpoints.getNews.initiate({ ...args, page: 2 }));
  await store.dispatch(api.endpoints.getNews.initiate({ ...args, page: 1 }, { forceRefetch: true }));
  const data = api.endpoints.getNews.select({ ...args, page: 1 })(store.getState()).data as Page;
  expect(data.items.map(i => i.id)).toEqual(['a', 'b']); });

it('search endpoint passes q through', async () => {
  const store = makeStore();
  const res = await store.dispatch(api.endpoints.search.initiate({ q: 'hello' }));
  expect(res.data?.news[0].id).toBe('hello'); });
