import { act, render } from '@testing-library/react';
import { useInfiniteSentinel } from '@/hooks/useInfiniteSentinel';

class FakeObserver {
  static all: FakeObserver[] = [];
  observed: Element[] = [];
  disconnected = false;
  constructor(
    readonly callback: IntersectionObserverCallback,
    readonly options?: IntersectionObserverInit,
  ) {
    FakeObserver.all.push(this);
  }
  observe(el: Element) {
    this.observed.push(el);
  }
  unobserve() {}
  disconnect() {
    this.disconnected = true;
  }
  takeRecords() {
    return [];
  }
  fire(isIntersecting: boolean) {
    act(() => {
      this.callback(
        [{ isIntersecting, target: this.observed[0] } as unknown as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      );
    });
  }
}

function Sentinel({ onHit, enabled }: { onHit: () => void; enabled: boolean }) {
  const ref = useInfiniteSentinel(onHit, enabled);
  return <div ref={ref} data-testid="sentinel" />;
}

beforeEach(() => {
  FakeObserver.all = [];
  vi.stubGlobal('IntersectionObserver', FakeObserver);
});
afterEach(() => vi.unstubAllGlobals());

describe('useInfiniteSentinel', () => {
  it('observes the element with a 400px root margin and reports only real intersections', () => {
    const onHit = vi.fn();
    const { getByTestId } = render(<Sentinel onHit={onHit} enabled />);

    expect(FakeObserver.all).toHaveLength(1);
    const [observer] = FakeObserver.all;
    expect(observer.observed).toEqual([getByTestId('sentinel')]);
    expect(observer.options).toEqual({ rootMargin: '400px' });

    observer.fire(false);
    expect(onHit).not.toHaveBeenCalled();
    observer.fire(true);
    expect(onHit).toHaveBeenCalledTimes(1);
  });

  it('observes nothing while disabled, and starts a fresh observer when re-enabled', () => {
    const onHit = vi.fn();
    const { rerender } = render(<Sentinel onHit={onHit} enabled={false} />);
    expect(FakeObserver.all).toHaveLength(0);

    rerender(<Sentinel onHit={onHit} enabled />);
    expect(FakeObserver.all).toHaveLength(1);

    // Turning it off disconnects; turning it on again must create a *new* observer (it reports the
    // sentinel's current state immediately, which is what chains loads on a short page).
    rerender(<Sentinel onHit={onHit} enabled={false} />);
    expect(FakeObserver.all[0].disconnected).toBe(true);
    rerender(<Sentinel onHit={onHit} enabled />);
    expect(FakeObserver.all).toHaveLength(2);
    expect(FakeObserver.all[1].disconnected).toBe(false);
  });

  it('always calls the latest onHit without recreating the observer', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(<Sentinel onHit={first} enabled />);
    rerender(<Sentinel onHit={second} enabled />);

    expect(FakeObserver.all).toHaveLength(1);
    FakeObserver.all[0].fire(true);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('disconnects on unmount', () => {
    const { unmount } = render(<Sentinel onHit={() => {}} enabled />);
    unmount();
    expect(FakeObserver.all[0].disconnected).toBe(true);
  });

  it('does nothing (and does not throw) where IntersectionObserver is missing', () => {
    vi.unstubAllGlobals();
    vi.stubGlobal('IntersectionObserver', undefined);
    expect(() => render(<Sentinel onHit={() => {}} enabled />)).not.toThrow();
  });
});
