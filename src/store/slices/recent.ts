import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ContentItem } from '@/lib/types';
import { hydrateAll } from '../actions';

/** Newest first. Each entry is a full snapshot, like favorites, so a details page can be reopened after a reload. */
export interface RecentState { items: ContentItem[] }

export const MAX_RECENT = 24;

const initialState: RecentState = { items: [] };

const slice = createSlice({
  name: 'recent',
  initialState,
  reducers: {
    /** Moves the item to the front (no duplicates) and drops the oldest beyond `MAX_RECENT`. */
    itemViewed(s, a: PayloadAction<ContentItem>) {
      s.items = [a.payload, ...s.items.filter((i) => i.id !== a.payload.id)].slice(0, MAX_RECENT);
    },
  },
  extraReducers: (b) => {
    b.addCase(hydrateAll, (s, a) => (a.payload.recent ? { ...s, ...a.payload.recent } : s));
  },
});

export const { itemViewed } = slice.actions;
export default slice.reducer;
