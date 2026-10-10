import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { hydrateAll } from '../actions';

/** User-chosen drag order, as item ids. Ids no longer in the feed are ignored by `applyOrder`. */
export interface FeedOrderState { ids: string[] }

const initialState: FeedOrderState = { ids: [] };

const slice = createSlice({
  name: 'feedOrder',
  initialState,
  reducers: {
    setOrder(s, a: PayloadAction<string[]>) { s.ids = a.payload; },
  },
  extraReducers: (b) => {
    b.addCase(hydrateAll, (s, a) => ({ ...s, ...a.payload.feedOrder }));
  },
});

export const { setOrder } = slice.actions;
export default slice.reducer;
