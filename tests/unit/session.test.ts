import reducer, { setSessionEmail, updateProfile } from '@/store/slices/session';
import { hydrateAll } from '@/store/actions';
const init = reducer(undefined, { type: '@@init' });
it('starts un-hydrated with no email', () => { expect(init.hydrated).toBe(false); expect(init.email).toBeNull(); });
it('sets the email and merges profile edits', () => {
  let s = reducer(init, setSessionEmail('demo@pulse.dev')); expect(s.email).toBe('demo@pulse.dev');
  s = reducer(s, updateProfile({ name: 'Ada' })); expect(s.profile.name).toBe('Ada'); expect(s.profile.avatarColor).toBe(init.profile.avatarColor); });
it('hydrateAll marks hydrated and restores the profile', () => {
  const s = reducer(init, hydrateAll({ profile: { name: 'Zed', avatarColor: '#abcdef' } }));
  expect(s.hydrated).toBe(true); expect(s.profile).toEqual({ name: 'Zed', avatarColor: '#abcdef' }); });
it('hydrateAll with no profile keeps the default profile', () => {
  expect(reducer(init, hydrateAll({})).profile).toEqual(init.profile); });
