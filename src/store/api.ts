import { createApi, fetchBaseQuery, type FetchArgs } from '@reduxjs/toolkit/query/react';
import type { Category, ContentItem, Page } from '@/lib/types';

const baseUrl = (typeof window === 'undefined' ? 'http://localhost:3000' : window.location.origin) + '/api';

export interface FeedArgs { categories: Category[]; page: number; tags?: string[] }
export interface SearchResult { news: ContentItem[]; movies: ContentItem[]; social: ContentItem[] }

/**
 * Shared definition for the three paginated feeds. All pages of one (categories, tags) combination
 * live in a single cache entry: `merge` appends each new page (de-duplicating by id) and page 1
 * replaces the entry (refresh / filters changed), `forceRefetch` triggers when only `page` changed.
 */
function infinite(url: string, extra: (a: FeedArgs) => Record<string, string> = () => ({})) {
  return {
    query: (a: FeedArgs): FetchArgs => ({
      url,
      params: { page: a.page, categories: a.categories.join(','), ...extra(a) },
    }),
    serializeQueryArgs: ({ queryArgs }: { queryArgs: FeedArgs }): string =>
      `${url}|${queryArgs.categories.join(',')}|${(queryArgs.tags ?? []).join(',')}`,
    merge: (cur: Page, inc: Page, { arg }: { arg: FeedArgs }): Page | void => {
      if (arg.page === 1) return inc;
      const seen = new Set(cur.items.map((i) => i.id));
      for (const item of inc.items) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        cur.items.push(item);
      }
      cur.nextPage = inc.nextPage;
      cur.source = inc.source;
    },
    forceRefetch: ({ currentArg, previousArg }: { currentArg: FeedArgs | undefined; previousArg: FeedArgs | undefined }): boolean =>
      currentArg?.page !== previousArg?.page,
  };
}

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl }),
  endpoints: (b) => ({
    getNews: b.query<Page, FeedArgs>(infinite('news')),
    getMovies: b.query<Page, FeedArgs>(infinite('movies')),
    getSocial: b.query<Page, FeedArgs>(infinite('social', (a) => ({ tags: (a.tags ?? []).join(',') }))),
    search: b.query<SearchResult, { q: string }>({ query: ({ q }) => ({ url: 'search', params: { q } }) }),
    /** One item by id; the fallback for a details page whose item is not already in memory. */
    getItem: b.query<ContentItem, { id: string }>({ query: ({ id }) => ({ url: 'item', params: { id } }) }),
  }),
});

export const { useGetNewsQuery, useGetMoviesQuery, useGetSocialQuery, useSearchQuery, useGetItemQuery } = api;
