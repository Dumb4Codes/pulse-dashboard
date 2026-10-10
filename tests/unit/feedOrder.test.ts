import reducer, { setOrder } from '@/store/slices/feedOrder';
it('stores order', () => expect(reducer(undefined, setOrder(['b','a'])).ids).toEqual(['b','a']));
