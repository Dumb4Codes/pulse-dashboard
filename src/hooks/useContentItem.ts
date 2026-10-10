'use client';

import { useEffect, useMemo } from 'react';
import { skipToken } from '@reduxjs/toolkit/query';
import { interleave } from '@/lib/interleave';
import type { ContentItem } from '@/lib/types';
import { useGetItemQuery, useGetMoviesQuery, useGetNewsQuery, useGetSocialQuery } from '@/store/api';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { findKnownItem } from '@/store/selectors';
import { itemViewed } from '@/store/slices/recent';

export const RELATED_LIMIT = 3;

export interface UseContentItem {
  /** `loading`: still working it out. `ready`: `item` is set. `missing`: nowhere to be found. */
  status: 'loading' | 'ready' | 'missing';
  item: ContentItem | null;
  /** Up to `RELATED_LIMIT` other items in the same category, mixed across news, movies and posts. */
  related: ContentItem[];
}

/**
 * Finds the item behind a details page.
 *
 *  1. Memory first (favorites, recently opened, the live wire, cached feed / trending / search pages),
 *     which is instant when the reader clicked a card.
 *  2. Otherwise `GET /api/item?id=` (the seeded catalogue can be rebuilt from an id alone).
 *  3. Otherwise `missing`.
 *
 * Nothing is decided before the saved state has been loaded from localStorage (`session.hydrated`),
 * so a reload of a details page shows the skeleton, not a flash of "not found". Whatever is found is
 * remembered in `recent`, which is what lets the same URL work again after a reload in live mode.
 */
export function useContentItem(id: string): UseContentItem {
  const dispatch = useAppDispatch();
  const hydrated = useAppSelector((s) => s.session.hydrated);
  const known = useAppSelector((s) => (hydrated ? findKnownItem(s, id) : null));
  const newest = useAppSelector((s) => s.recent.items[0]?.id);

  const fetched = useGetItemQuery({ id }, { skip: !hydrated || known !== null });
  const item = known ?? fetched.currentData ?? null;

  useEffect(() => {
    if (hydrated && item && newest !== item.id) dispatch(itemViewed(item));
  }, [dispatch, hydrated, item, newest]);

  // Same-category suggestions come from the same cached endpoints as the feed, so they are free
  // when the reader came from there.
  const args = item ? { categories: [item.category], page: 1 } : skipToken;
  const news = useGetNewsQuery(args);
  const movies = useGetMoviesQuery(args);
  const social = useGetSocialQuery(item ? { categories: [item.category], page: 1, tags: [] } : skipToken);
  const newsItems = news.currentData?.items;
  const movieItems = movies.currentData?.items;
  const socialItems = social.currentData?.items;

  const related = useMemo(
    () =>
      interleave([newsItems ?? [], movieItems ?? [], socialItems ?? []])
        .filter((candidate) => candidate.id !== item?.id)
        .slice(0, RELATED_LIMIT),
    [newsItems, movieItems, socialItems, item?.id],
  );

  let status: UseContentItem['status'] = 'loading';
  if (item) status = 'ready';
  else if (hydrated && fetched.isError) status = 'missing';

  return { status, item, related };
}
