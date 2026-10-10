import { mockPage } from '@/lib/server/mockProvider';
import { parseParams } from '@/lib/params';
const P = (s = '') => parseParams(new URLSearchParams(s));
it('returns 9 items on page 1 for every type', () => (['news','movie','social'] as const).forEach(t => expect(mockPage(t, P()).items).toHaveLength(9)));
it('is deterministic', () => expect(mockPage('news', P('page=2'))).toEqual(mockPage('news', P('page=2'))));
it('filters by category', () => mockPage('news', P('categories=sports')).items.forEach(i => expect(i.category).toBe('sports')));
it('filters by q (case-insensitive) and returns [] with nextPage null when nothing matches', () => {
  const r = mockPage('news', P('q=zzzzqqq')); expect(r.items).toEqual([]); expect(r.nextPage).toBeNull(); });
it('social filters by tag', () => mockPage('social', P('tags=tech')).items.forEach(i => expect(i.description.toLowerCase()).toContain('#tech')));
it('paginates to a finite end', () => expect(mockPage('news', P('page=5')).nextPage).toBeNull());
it('ids are unique across pages', () => { const ids = [1,2,3].flatMap(n => mockPage('news', P(`page=${n}`)).items.map(i => i.id)); expect(new Set(ids).size).toBe(ids.length); });
