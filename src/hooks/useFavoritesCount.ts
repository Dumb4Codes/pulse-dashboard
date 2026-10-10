'use client';

import { useAppSelector } from '@/store/hooks';

/** Number of saved favorites. Selects a primitive, so consumers only re-render when the count changes. */
export function useFavoritesCount(): number {
  return useAppSelector((s) => Object.keys(s.favorites.byId).length);
}
