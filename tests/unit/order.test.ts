import { applyOrder } from '@/lib/order';
const mk = (...ids: string[]) => ids.map(id => ({ id }));
describe('applyOrder', () => {
  it('sorts known ids by saved order, appends unknown in natural order', () =>
    expect(applyOrder(mk('a','b','c','d'), ['c','a']).map(i=>i.id)).toEqual(['c','a','b','d']));
  it('ignores saved ids that are no longer present', () =>
    expect(applyOrder(mk('a','b'), ['zzz','b']).map(i=>i.id)).toEqual(['b','a']));
  it('empty order keeps natural order', () => expect(applyOrder(mk('a','b'), []).map(i=>i.id)).toEqual(['a','b']));
});
