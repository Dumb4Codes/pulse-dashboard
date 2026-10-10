import { createSelector } from '@reduxjs/toolkit';
import type { ContentItem } from '@/lib/types';
import type { RootState } from './index';

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isItem = (v: unknown): v is ContentItem => isRecord(v) && typeof v.id === 'string' && typeof v.title === 'string';

function itemsIn(list: unknown): ContentItem[] {
  return Array.isArray(list) ? list.filter(isItem) : [];
}

/**
 * Every item the app already holds for `id`, cheapest source first: favorites and recently opened
 * (both saved), the live wire, then whatever the feed / trending / search requests have cached.
 * Returns the stored object itself (never a copy), so selecting it does not cause extra renders.
 */
export function findKnownItem(state: RootState, id: string): ContentItem | null {
  const saved = state.favorites.byId[id] ?? state.recent.items.find((i) => i.id === id);
  if (saved) return saved;

  const live = state.live.injected.find((i) => i.id === id) ?? state.live.pending.find((i) => i.id === id);
  if (live) return live;

  for (const entry of Object.values(state.api.queries)) {
    const data: unknown = entry?.data;
    if (!isRecord(data)) continue;
    // Feed pages ({ items }), one item ({ id }), or a search ({ news, movies, social }).
    const candidates = isItem(data)
      ? [data]
      : [...itemsIn(data.items), ...itemsIn(data.news), ...itemsIn(data.movies), ...itemsIn(data.social)];
    const hit = candidates.find((i) => i.id === id);
    if (hit) return hit;
  }
  return null;
}

/**
 * The live wire sends stories from every category, and the store keeps all of them, but the reader
 * only sees the ones in their selected categories: both the "N new items" count and the feed use
 * these. Filtering on read (not on arrival) means re-selecting a category brings its items back.
 */
export const selectPendingForCategories = createSelector(
  [(s: RootState) => s.live.pending, (s: RootState) => s.preferences.categories],
  (pending, categories): ContentItem[] => pending.filter((i) => categories.includes(i.category)),
);

export const selectInjectedForCategories = createSelector(
  [(s: RootState) => s.live.injected, (s: RootState) => s.preferences.categories],
  (injected, categories): ContentItem[] => injected.filter((i) => categories.includes(i.category)),
);
