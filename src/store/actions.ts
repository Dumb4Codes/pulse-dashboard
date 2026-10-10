import { createAction } from '@reduxjs/toolkit';
import type { FavoritesState } from './slices/favorites';
import type { FeedOrderState } from './slices/feedOrder';
import type { PreferencesState } from './slices/preferences';
import type { RecentState } from './slices/recent';
import type { Profile } from './slices/session';

/** The slice of Redux state that is written to localStorage (key `pulse:v1`). */
export interface PersistedState {
  preferences: PreferencesState;
  favorites: FavoritesState;
  feedOrder: FeedOrderState;
  profile: Profile;
  recent: RecentState;
}

/**
 * Dispatched once on the client after mount with whatever `loadPersisted()` returned.
 * Every persisted slice merges its part; `session.hydrated` flips to true, which is the gate
 * that lets the persistence listener start writing (so we never overwrite saved data early).
 */
export const hydrateAll = createAction<Partial<PersistedState>>('app/hydrateAll');
