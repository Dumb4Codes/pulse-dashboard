import reducer, { toggleCategory, setTheme, setLanguage, setHashtags } from '@/store/slices/preferences';
const init = reducer(undefined, { type: '@@init' });
it('has sane defaults', () => expect(init.categories).toEqual(['technology','sports','finance']));
it('adds a category', () => expect(reducer(init, toggleCategory('health')).categories).toContain('health'));
it('removes a category', () => expect(reducer(init, toggleCategory('sports')).categories).not.toContain('sports'));
it('refuses to remove the last category', () => {
  const s = { ...init, categories: ['sports'] as typeof init.categories };
  expect(reducer(s, toggleCategory('sports')).categories).toEqual(['sports']); });
it('sets theme + language', () => { const s = reducer(reducer(init, setTheme('dark')), setLanguage('hi')); expect([s.theme, s.language]).toEqual(['dark','hi']); });
it('sets hashtags', () => expect(reducer(init, setHashtags(['a', 'b'])).hashtags).toEqual(['a', 'b']));
