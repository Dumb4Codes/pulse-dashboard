import reducer, { toggleFavorite, selectFavorites, selectIsFavorite } from '@/store/slices/favorites';
import { makeStore } from '@/store';
const item = { id:'n1', type:'news', category:'sports', title:'T', description:'', image:'', url:'', source:'', publishedAt:'', score:1 } as const;
it('toggles on and off', () => { const on = reducer(undefined, toggleFavorite(item)); expect(on.byId.n1.title).toBe('T'); expect(reducer(on, toggleFavorite(item)).byId.n1).toBeUndefined(); });
it('keeps a snapshot so the favorite survives the item leaving the feed', () => expect(reducer(undefined, toggleFavorite(item)).byId.n1).toEqual(item));
it('selectors expose the saved snapshots and membership', () => {
  const s = makeStore(); expect(selectFavorites(s.getState())).toEqual([]); expect(selectIsFavorite('n1')(s.getState())).toBe(false);
  s.dispatch(toggleFavorite(item));
  expect(selectFavorites(s.getState())).toEqual([item]); expect(selectIsFavorite('n1')(s.getState())).toBe(true); });
