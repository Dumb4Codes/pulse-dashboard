import { renderHook, act } from '@testing-library/react';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
describe('useDebouncedValue', () => {
  beforeEach(() => vi.useFakeTimers()); afterEach(() => vi.useRealTimers());
  it('only emits the last value after the delay', () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 300), { initialProps: { v: 'a' } });
    rerender({ v: 'ab' }); rerender({ v: 'abc' });
    expect(result.current).toBe('a');
    act(() => { vi.advanceTimersByTime(299); }); expect(result.current).toBe('a');
    act(() => { vi.advanceTimersByTime(1); });   expect(result.current).toBe('abc');
  });
});
