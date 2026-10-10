import reducer, { liveReceived, flushLive } from '@/store/slices/live';
const it1 = { id:'l1' } as any;
it('queues then flushes to injected, newest first, no duplicates', () => {
  let s = reducer(undefined, liveReceived(it1)); s = reducer(s, liveReceived(it1));
  expect(s.pending).toHaveLength(1);
  s = reducer(s, flushLive()); expect(s.pending).toEqual([]); expect(s.injected.map(i => i.id)).toEqual(['l1']); });
it('orders a batch newest first', () => {
  let s = reducer(undefined, liveReceived({ id:'a' } as any)); s = reducer(s, liveReceived({ id:'b' } as any));
  s = reducer(s, flushLive()); expect(s.injected.map(i => i.id)).toEqual(['b','a']); });
it('ignores ids already injected and puts newer batches first', () => {
  let s = reducer(undefined, liveReceived(it1)); s = reducer(s, flushLive());
  s = reducer(s, liveReceived(it1)); expect(s.pending).toEqual([]);
  s = reducer(s, liveReceived({ id:'l2' } as any)); s = reducer(s, flushLive());
  expect(s.injected.map(i => i.id)).toEqual(['l2','l1']); });
