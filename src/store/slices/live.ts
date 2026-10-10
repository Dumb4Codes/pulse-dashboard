import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ContentItem } from '@/lib/types';

/** `pending` = received from SSE but not yet shown (drives the "N new items" pill). */
export interface LiveState { pending: ContentItem[]; injected: ContentItem[] }

const initialState: LiveState = { pending: [], injected: [] };

const slice = createSlice({
  name: 'live',
  initialState,
  reducers: {
    liveReceived(s, a: PayloadAction<ContentItem>) {
      const id = a.payload.id;
      if (s.pending.some((i) => i.id === id) || s.injected.some((i) => i.id === id)) return;
      s.pending.unshift(a.payload); // newest first
    },
    /** Move everything pending to the front of `injected` (newest first). */
    flushLive(s) {
      s.injected = [...s.pending, ...s.injected];
      s.pending = [];
    },
  },
});

export const { liveReceived, flushLive } = slice.actions;
export default slice.reducer;
