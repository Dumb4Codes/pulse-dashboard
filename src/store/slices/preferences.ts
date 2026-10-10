import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Category } from '@/lib/types';
import { hydrateAll } from '../actions';

export const THEMES = ['light', 'dark', 'system'] as const;
export const LANGUAGES = ['en', 'hi', 'es'] as const;
export type Theme = (typeof THEMES)[number];
export type Language = (typeof LANGUAGES)[number];

export interface PreferencesState {
  categories: Category[];
  hashtags: string[];
  theme: Theme;
  language: Language;
}

export const DEFAULT_PREFERENCES: PreferencesState = {
  categories: ['technology', 'sports', 'finance'],
  hashtags: ['tech', 'design'],
  theme: 'system',
  language: 'en',
};

const slice = createSlice({
  name: 'preferences',
  initialState: DEFAULT_PREFERENCES,
  reducers: {
    /** Add or remove a category. The last remaining category can never be removed. */
    toggleCategory(s, a: PayloadAction<Category>) {
      const i = s.categories.indexOf(a.payload);
      if (i === -1) s.categories.push(a.payload);
      else if (s.categories.length > 1) s.categories.splice(i, 1);
    },
    setTheme(s, a: PayloadAction<Theme>) { s.theme = a.payload; },
    setLanguage(s, a: PayloadAction<Language>) { s.language = a.payload; },
    setHashtags(s, a: PayloadAction<string[]>) { s.hashtags = a.payload; },
  },
  extraReducers: (b) => {
    b.addCase(hydrateAll, (s, a) => ({ ...s, ...a.payload.preferences }));
  },
});

export const { toggleCategory, setTheme, setLanguage, setHashtags } = slice.actions;
export default slice.reducer;
