'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { interleave } from '@/lib/interleave';
import { applyOrder } from '@/lib/order';
import type { ContentItem } from '@/lib/types';
import { useGetMoviesQuery, useGetNewsQuery, useGetSocialQuery } from '@/store/api';
import { useAppSelector } from '@/store/hooks';
import { selectInjectedForCategories } from '@/store/selectors';

export interface UseFeed {
  /** What to render: live items the reader has not placed, then the saved order, then the rest. */
  items: ContentItem[];
  /** First load of the current filters: nothing to show yet, nothing failed yet. */
  isLoading: boolean;
  /** A later page is on its way. */
  isFetchingMore: boolean;
  /** Blocking failure: all three sources failed and there is nothing to show. */
  isError: boolean;
  /** Some, not all, sources failed (the rest of the feed is still usable). */
  hasPartialError: boolean;
  /** At least one source reports another page. */
  hasMore: boolean;
  /** `hasMore`, and nothing is in flight or broken: safe to ask for the next page. */
  canLoadMore: boolean;
  /** Asks for the next page. Idempotent until that page has settled. */
  loadMore: () => void;
  /** Refetches the sources that failed (same page, so nothing is skipped). Resolves when they settle. */
  retry: () => Promise<void>;
}

/**
 * The home feed: three RTK Query sources (news, movies, social) for the user's categories and
 * hashtags, interleaved into one list.
 *
 * Paging. `page` is shared by the three queries and starts at 1; it returns to 1 whenever the
 * categories or hashtags change (derived during render, so no request is ever made for the new
 * filters with the old page). Each source keeps all its pages in one cache entry (see store/api.ts),
 * so `currentData` is the whole list loaded so far, de-duplicated by id.
 *
 * Order. Items the reader dragged follow `feedOrder`; ids that are no longer in the feed are
 * ignored and new arrivals (next pages) land after the ordered ones. Live items that were pushed
 * in and not yet placed go to the very top, newest first; once dragged they obey the saved order.
 *
 * Failure. One failing source never hides the others. `isError` is only the all-failed case.
 * A failed page is never skipped: paging stops while anything is broken, and `retry` repeats the
 * same page.
 */
export function useFeed(): UseFeed {
  const categories = useAppSelector((s) => s.preferences.categories);
  const hashtags = useAppSelector((s) => s.preferences.hashtags);
  const order = useAppSelector((s) => s.feedOrder.ids);
  const injected = useAppSelector(selectInjectedForCategories);

  const filterKey = `${categories.join(',')}|${hashtags.join(',')}`;
  const [paging, setPaging] = useState({ key: filterKey, page: 1 });
  const page = paging.key === filterKey ? paging.page : 1;
  if (paging.key !== filterKey) setPaging({ key: filterKey, page: 1 });

  // Hashtags only filter posts, so they are part of the social cache key and nothing else's.
  const news = useGetNewsQuery({ categories, page });
  const movies = useGetMoviesQuery({ categories, page });
  const social = useGetSocialQuery({ categories, page, tags: hashtags });
  const results = [news, movies, social];

  const newsItems = news.currentData?.items;
  const movieItems = movies.currentData?.items;
  const socialItems = social.currentData?.items;

  const items = useMemo(() => {
    const injectedIds = new Set(injected.map((i) => i.id));
    const base = interleave([newsItems ?? [], movieItems ?? [], socialItems ?? []]).filter(
      (i) => !injectedIds.has(i.id),
    );
    const placed = new Set(order);
    return [
      ...injected.filter((i) => !placed.has(i.id)),
      ...applyOrder([...injected.filter((i) => placed.has(i.id)), ...base], order),
    ];
  }, [injected, newsItems, movieItems, socialItems, order]);

  const failed = results.filter((r) => r.isError).length;
  const isLoading = results.some((r) => r.currentData === undefined && !r.isError);
  const isError = failed === results.length && items.length === 0;
  const hasPartialError = failed > 0 && !isError;
  const fetching = results.some((r) => r.isFetching);
  const isFetchingMore = page > 1 && fetching;
  const hasMore = results.some((r) => r.currentData?.nextPage != null);
  const canLoadMore = hasMore && !isLoading && !fetching && failed === 0;

  // Several observer notifications can arrive before React re-renders; only the first may advance
  // the page. Released once the requests it started have settled.
  const advancing = useRef(false);
  useEffect(() => {
    if (!fetching) advancing.current = false;
  }, [fetching]);

  const loadMore = useCallback(() => {
    if (!canLoadMore || advancing.current) return;
    advancing.current = true;
    setPaging({ key: filterKey, page: page + 1 });
  }, [canLoadMore, filterKey, page]);

  const refetchNews = news.refetch;
  const refetchMovies = movies.refetch;
  const refetchSocial = social.refetch;
  const newsFailed = news.isError;
  const moviesFailed = movies.isError;
  const socialFailed = social.isError;
  const retry = useCallback(async () => {
    const pending: PromiseLike<unknown>[] = [];
    if (newsFailed) pending.push(refetchNews());
    if (moviesFailed) pending.push(refetchMovies());
    if (socialFailed) pending.push(refetchSocial());
    await Promise.allSettled(pending);
  }, [newsFailed, moviesFailed, socialFailed, refetchNews, refetchMovies, refetchSocial]);

  return { items, isLoading, isFetchingMore, isError, hasPartialError, hasMore, canLoadMore, loadMore, retry };
}
