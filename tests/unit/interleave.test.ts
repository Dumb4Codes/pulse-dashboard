import { interleave } from '@/lib/interleave';
const mk = (...ids: string[]) => ids.map(id => ({ id }));
describe('interleave', () => {
  it('round-robins lists', () => expect(interleave([mk('a1','a2'), mk('b1','b2')]).map(i=>i.id)).toEqual(['a1','b1','a2','b2']));
  it('handles uneven + empty lists', () => expect(interleave([mk('a1','a2','a3'), [], mk('c1')]).map(i=>i.id)).toEqual(['a1','c1','a2','a3']));
  it('dedupes by id (same item on two pages)', () => expect(interleave([mk('x','y'), mk('x')]).map(i=>i.id)).toEqual(['x','y']));
  it('returns [] for no input', () => expect(interleave([])).toEqual([]));
});
