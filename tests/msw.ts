import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ContentItem, ContentType, Page } from '@/lib/types';

/**
 * Shared MSW server for integration tests. Each test file registers its own lifecycle
 * (`beforeAll(listen)`, `afterEach(resetHandlers)`, `afterAll(close)`) so files stay isolated.
 */
export const server = setupServer();

export type Endpoint = 'news' | 'movies' | 'social';

const TYPE_BY_PREFIX: Record<string, ContentType> = { news: 'news', movie: 'movie', post: 'social' };

/** A fully-formed item. Defaults describe a news story; override anything. */
export function makeItem(id: string, over: Partial<ContentItem> = {}): ContentItem {
  return {
    id,
    type: 'news',
    category: 'technology',
    title: `Title ${id}`,
    description: `Description of ${id}`,
    image: '',
    url: `https://example.com/${id}`,
    source: 'Test Wire',
    publishedAt: '2026-10-08T00:00:00.000Z',
    score: 1,
    ...over,
  };
}

/**
 * `n` items with ids `${prefix}-${start}`, `${prefix}-${start + 1}`, ... and titles `Title ${id}`.
 * The prefix picks the content type: `news` -> news, `movie` -> movie, `post` -> social
 * (anything else -> news). `nextPage` defaults to null (last page).
 */
export function pageOf(
  n: number,
  prefix: string,
  { nextPage = null, start = 0 }: { nextPage?: number | null; start?: number } = {},
): Page {
  const type = TYPE_BY_PREFIX[prefix] ?? 'news';
  const items = Array.from({ length: n }, (_, i) => makeItem(`${prefix}-${start + i}`, { type }));
  return { items, nextPage, source: 'mock' };
}

/** A response body, or an HTTP status number meaning "fail with that status". */
export type FeedResponse = Page | number;

const PREFIX: Record<Endpoint, string> = { news: 'news', movies: 'movie', social: 'post' };

/**
 * Registers handlers for the three feed endpoints. Anything not listed answers with an empty,
 * final page. A function receives the request's `page` query parameter, for paging tests.
 */
export function mockFeedResponses(
  responses: Partial<Record<Endpoint, FeedResponse | ((page: number) => FeedResponse)>>,
): void {
  const handlers = (Object.keys(PREFIX) as Endpoint[]).map((endpoint) =>
    http.get(`*/api/${endpoint}`, ({ request }) => {
      const entry = responses[endpoint];
      const page = Number(new URL(request.url).searchParams.get('page') ?? '1');
      const body = (typeof entry === 'function' ? entry(page) : entry) ?? pageOf(0, PREFIX[endpoint]);
      return typeof body === 'number'
        ? HttpResponse.json({ error: 'boom' }, { status: body })
        : HttpResponse.json(body);
    }),
  );
  server.use(...handlers);
}
