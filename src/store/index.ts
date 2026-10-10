import { combineReducers, configureStore, createListenerMiddleware } from '@reduxjs/toolkit';
import { api } from './api';
import { pickPersisted, savePersisted } from './persist';
import favorites from './slices/favorites';
import feedOrder from './slices/feedOrder';
import live from './slices/live';
import preferences from './slices/preferences';
import recent from './slices/recent';
import session from './slices/session';

const rootReducer = combineReducers({
  preferences,
  favorites,
  feedOrder,
  session,
  live,
  recent,
  [api.reducerPath]: api.reducer,
});

export type RootState = ReturnType<typeof rootReducer>;

export function makeStore(preloaded?: Partial<RootState>) {
  // One listener (and one "last saved" memo) per store so stores never share persistence state.
  const persistence = createListenerMiddleware<RootState>();
  let last: { p: unknown; f: unknown; o: unknown; pr: unknown; r: unknown } | undefined;

  persistence.startListening({
    // Never write before hydration: it would clobber the saved data with defaults.
    predicate: (_action, state) => state.session.hydrated,
    effect: (_action, { getState }) => {
      const s = getState();
      const next = { p: s.preferences, f: s.favorites, o: s.feedOrder, pr: s.session.profile, r: s.recent };
      // Slices use immutable updates, so unchanged references mean nothing to write
      // (skips api/live/unrelated actions).
      if (last && last.p === next.p && last.f === next.f && last.o === next.o && last.pr === next.pr && last.r === next.r) return;
      last = next;
      savePersisted(pickPersisted(s));
    },
  });

  return configureStore({
    reducer: rootReducer,
    preloadedState: preloaded,
    middleware: (getDefault) => getDefault().concat(api.middleware, persistence.middleware),
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore['dispatch'];
