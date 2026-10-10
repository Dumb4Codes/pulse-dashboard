import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ContentItem } from '@/lib/types';
import { hydrateAll } from '../actions';

/** Favorites store a full snapshot of the item so they survive it leaving the API feed. */
export interface FavoritesState { byId: Record<string, ContentItem> }

const initialState: FavoritesState = { byId: {} };

const slice = createSlice({
  name: 'favorites',
  initialState,
  reducers: {
    toggleFavorite(s, a: PayloadAction<ContentItem>) {
      if (s.byId[a.payload.id]) delete s.byId[a.payload.id];
      else s.byId[a.payload.id] = a.payload;
    },
  },
  extraReducers: (b) => {
    b.addCase(hydrateAll, (s, a) => ({ ...s, ...a.payload.favorites }));
  },
});

export const { toggleFavorite } = slice.actions;
export default slice.reducer;

// Selectors take the minimal structural shape (RootState satisfies it) so this module has no
// type-level cycle with the store.
type WithFavorites = { favorites: FavoritesState };
export const selectFavorites = createSelector(
  [(s: WithFavorites) => s.favorites.byId],
  (byId): ContentItem[] => Object.values(byId),
);
export const selectIsFavorite = (id: string) => (s: WithFavorites): boolean => id in s.favorites.byId;
