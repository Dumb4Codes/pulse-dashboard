import { loadPersisted, savePersisted, pickPersisted, STORAGE_KEY } from '@/store/persist';
import { makeStore } from '@/store';
import { hydrateAll } from '@/store/actions';
import { api } from '@/store/api';
it('returns {} when empty', () => expect(loadPersisted()).toEqual({}));
it('returns {} on corrupt JSON', () => { localStorage.setItem(STORAGE_KEY, '{not json'); expect(loadPersisted()).toEqual({}); });
it('returns {} on wrong version', () => { localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 99 })); expect(loadPersisted()).toEqual({}); });
it('drops invalid fields (bad theme) but keeps valid ones', () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ v:1, preferences:{ theme:'neon', language:'es', categories:['sports','bogus'], hashtags:[] } }));
  const p = loadPersisted(); expect(p.preferences?.theme).toBe('system'); expect(p.preferences?.language).toBe('es'); expect(p.preferences?.categories).toEqual(['sports']); });
it('does not throw when localStorage throws', () => {
  const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
  expect(loadPersisted()).toEqual({}); spy.mockRestore();
  const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
  expect(() => makeStore().dispatch(hydrateAll({}))).not.toThrow(); set.mockRestore(); });
it('round-trips state through the store listener only after hydration', () => {
  const s = makeStore(); s.dispatch({ type: 'preferences/setTheme', payload: 'dark' });
  expect(localStorage.getItem(STORAGE_KEY)).toBeNull();          // not hydrated → must not overwrite saved data
  s.dispatch(hydrateAll({})); s.dispatch({ type: 'preferences/setTheme', payload: 'dark' });
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).preferences.theme).toBe('dark'); });

// --- additional hardening (beyond the brief) ---
it('does not throw when the localStorage accessor itself throws (e.g. blocked site data)', () => {
  const spy = vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new Error('SecurityError'); });
  try {
    expect(loadPersisted()).toEqual({});
    expect(() => savePersisted(pickPersisted(makeStore().getState()))).not.toThrow();
  } finally { spy.mockRestore(); } });
it('returns {} when the stored value is not an object', () => {
  for (const raw of ['null', '42', '"str"', '[]']) { localStorage.setItem(STORAGE_KEY, raw); expect(loadPersisted()).toEqual({}); } });
it('omits keys that are missing from storage', () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ v:1, preferences:{ theme:'dark' } }));
  const p = loadPersisted(); expect(Object.keys(p)).toEqual(['preferences']);
  expect(p.preferences?.theme).toBe('dark'); });
it('falls back to default categories when none are valid, and sanitises hashtags', () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ v:1, preferences:{ categories:['bogus'], hashtags:['ok_1','Bad Tag','<b>', 7, ...Array.from({length:20},(_, i)=>`t${i}`)] } }));
  const p = loadPersisted();
  expect(p.preferences?.categories).toEqual(['technology','sports','finance']);
  expect(p.preferences?.hashtags).toHaveLength(10);
  expect(p.preferences?.hashtags?.[0]).toBe('ok_1');
  expect(p.preferences?.hashtags).not.toContain('Bad Tag'); });
it('drops malformed favorites / order / profile entries', () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ v:1,
    favorites:{ byId:{ good:{ id:'good', type:'news', category:'sports', title:'T', description:'', image:'', url:'', source:'', publishedAt:'', score:1 }, bad:{ id:1 }, worse:'x' } },
    feedOrder:{ ids:['a', 3, 'b'] }, profile:{ name:'  Ada  ', avatarColor:'not-a-color' } }));
  const p = loadPersisted();
  expect(Object.keys(p.favorites!.byId)).toEqual(['good']);
  expect(p.feedOrder!.ids).toEqual(['a','b']);
  expect(p.profile!.name).toBe('Ada');
  expect(p.profile!.avatarColor).toMatch(/^#[0-9a-fA-F]{6}$/); });
it('hydrating from storage restores the saved state', () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ v:1, preferences:{ theme:'dark', language:'hi', categories:['health'], hashtags:['x'] }, profile:{ name:'Ada', avatarColor:'#112233' } }));
  const s = makeStore(); s.dispatch(hydrateAll(loadPersisted()));
  const st = s.getState();
  expect(st.preferences).toMatchObject({ theme:'dark', language:'hi', categories:['health'], hashtags:['x'] });
  expect(st.session.profile).toEqual({ name:'Ada', avatarColor:'#112233' });
  expect(st.session.hydrated).toBe(true); });
it('does not write on non-persisted (api) actions after hydration', () => {
  const s = makeStore(); s.dispatch(hydrateAll({}));
  const set = vi.spyOn(Storage.prototype, 'setItem');
  s.dispatch(api.util.resetApiState()); s.dispatch({ type: 'some/unrelated' });
  expect(set).not.toHaveBeenCalled(); set.mockRestore(); });
