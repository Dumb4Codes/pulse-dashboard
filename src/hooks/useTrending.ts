'use client';

import { useCallback, useMemo } from 'react';
import type { ContentItem, ContentType, Page } from '@/lib/types';
import { useGetMoviesQuery, useGetNewsQuery, useGetSocialQuery } from '@/store/api';
import { useAppSelector } from '@/store/hooks';

/** How many ranked items a tab shows. */
export const TRENDING_LIMIT = 10;

export interface TrendingState {
  /** At most `TRENDING_LIMIT` items, highest `score` first. */
  items: ContentItem[];
  /** First load of the current categories: nothing to show yet and nothing has failed. */
  isLoading: boolean;
  /** The source failed and there is nothing to show. Stays true while a retry is in flight. */
  isError: boolean;
  /** Refetches this source. Resolves when it settles. */
  retry: () => Promise<void>;
}

/** Highest score first; equal scores keep the order the API sent them in (the sort is stable). */
function rank(page: Page | undefined): ContentItem[] {
  return page ? [...page.items].sort((a, b) => b.score - a.score).slice(0, TRENDING_LIMIT) : [];
}

/**
 * Trending is the first page of each content source for the reader's categories, ranked by score.
 * It reads the same RTK Query endpoints as the feed (news and movies even share its cache entries),
 * and loads all three at once so switching tabs is instant.
 *
 * `currentData` (not `data`) is what counts as "loaded", so changing categories never shows the
 * previous categories' ranking. A failed refetch keeps `error` set, so the error panel (and the
 * keyboard focus on its retry button) survives the retry instead of flashing a skeleton.
 */
export function useTrending(): Record<ContentType, TrendingState> {
  const categories = useAppSelector((s) => s.preferences.categories);
  const news = useGetNewsQuery({ categories, page: 1 });
  const movies = useGetMoviesQuery({ categories, page: 1 });
  const social = useGetSocialQuery({ categories, page: 1 });

  const newsPage = news.currentData;
  const moviePage = movies.currentData;
  const socialPage = social.currentData;
  const newsItems = useMemo(() => rank(newsPage), [newsPage]);
  const movieItems = useMemo(() => rank(moviePage), [moviePage]);
  const socialItems = useMemo(() => rank(socialPage), [socialPage]);

  const { refetch: refetchNews } = news;
  const { refetch: refetchMovies } = movies;
  const { refetch: refetchSocial } = social;
  const retryNews = useCallback(async () => void (await refetchNews()), [refetchNews]);
  const retryMovies = useCallback(async () => void (await refetchMovies()), [refetchMovies]);
  const retrySocial = useCallback(async () => void (await refetchSocial()), [refetchSocial]);

  return {
    news: {
      items: newsItems,
      isLoading: newsPage === undefined && news.error === undefined,
      isError: newsPage === undefined && news.error !== undefined,
      retry: retryNews,
    },
    movie: {
      items: movieItems,
      isLoading: moviePage === undefined && movies.error === undefined,
      isError: moviePage === undefined && movies.error !== undefined,
      retry: retryMovies,
    },
    social: {
      items: socialItems,
      isLoading: socialPage === undefined && social.error === undefined,
      isError: socialPage === undefined && social.error !== undefined,
      retry: retrySocial,
    },
  };
}
