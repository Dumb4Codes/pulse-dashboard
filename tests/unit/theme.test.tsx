import { act, render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { ThemeSync } from '@/components/ThemeSync';
import { makeStore } from '@/store';
import { DEFAULT_PREFERENCES, setTheme } from '@/store/slices/preferences';
import { renderWithStore } from '../helpers';

type Listener = () => void;

/** Controllable `prefers-color-scheme: dark` stand-in. `set()` flips the match and notifies listeners. */
function mockSystemDark(initial: boolean) {
  let current = initial;
  const listeners = new Set<Listener>();
  const mq = {
    get matches() {
      return current;
    },
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener: (_type: string, cb: Listener) => listeners.add(cb),
    removeEventListener: (_type: string, cb: Listener) => listeners.delete(cb),
    addListener: (cb: Listener) => listeners.add(cb),
    removeListener: (cb: Listener) => listeners.delete(cb),
    dispatchEvent: () => false,
  };
  window.matchMedia = vi.fn(() => mq) as unknown as typeof window.matchMedia;
  return {
    listenerCount: () => listeners.size,
    set(next: boolean) {
      current = next;
      act(() => listeners.forEach((cb) => cb()));
    },
  };
}

const original = window.matchMedia;
const theme = () => document.documentElement.dataset.theme;

beforeEach(() => {
  delete document.documentElement.dataset.theme;
});
afterEach(() => {
  window.matchMedia = original;
});

describe('ThemeSync', () => {
  it('writes an explicit dark theme to <html data-theme>', () => {
    renderWithStore(<ThemeSync />, { preloaded: { preferences: { ...DEFAULT_PREFERENCES, theme: 'dark' } } });
    expect(theme()).toBe('dark');
  });

  it('writes an explicit light theme even when the OS prefers dark', () => {
    mockSystemDark(true);
    renderWithStore(<ThemeSync />, { preloaded: { preferences: { ...DEFAULT_PREFERENCES, theme: 'light' } } });
    expect(theme()).toBe('light');
  });

  it('resolves "system" through prefers-color-scheme: dark -> dark', () => {
    mockSystemDark(true);
    renderWithStore(<ThemeSync />, { preloaded: { preferences: { ...DEFAULT_PREFERENCES, theme: 'system' } } });
    expect(theme()).toBe('dark');
  });

  it('resolves "system" with a light OS -> light', () => {
    mockSystemDark(false);
    renderWithStore(<ThemeSync />, { preloaded: { preferences: { ...DEFAULT_PREFERENCES, theme: 'system' } } });
    expect(theme()).toBe('light');
  });

  it('updates the attribute when the stored theme changes', () => {
    const { store } = renderWithStore(<ThemeSync />, {
      preloaded: { preferences: { ...DEFAULT_PREFERENCES, theme: 'dark' } },
    });
    expect(theme()).toBe('dark');
    act(() => {
      store.dispatch(setTheme('light'));
    });
    expect(theme()).toBe('light');
    act(() => {
      store.dispatch(setTheme('dark'));
    });
    expect(theme()).toBe('dark');
  });

  it('follows live OS changes while on "system", and stops following once a theme is chosen', () => {
    const os = mockSystemDark(false);
    const { store } = renderWithStore(<ThemeSync />, {
      preloaded: { preferences: { ...DEFAULT_PREFERENCES, theme: 'system' } },
    });
    expect(theme()).toBe('light');
    os.set(true);
    expect(theme()).toBe('dark');
    os.set(false);
    expect(theme()).toBe('light');

    act(() => {
      store.dispatch(setTheme('dark'));
    });
    os.set(false);
    expect(theme()).toBe('dark');
  });

  it('removes its media-query listener on unmount', () => {
    const os = mockSystemDark(false);
    const { unmount } = renderWithStore(<ThemeSync />, {
      preloaded: { preferences: { ...DEFAULT_PREFERENCES, theme: 'system' } },
    });
    expect(os.listenerCount()).toBeGreaterThan(0);
    unmount();
    expect(os.listenerCount()).toBe(0);
  });

  it('does not touch <html> before the store hydrates (keeps the no-flash inline script value)', () => {
    mockSystemDark(false);
    document.documentElement.dataset.theme = 'dark'; // what the pre-paint script wrote from localStorage
    const store = makeStore(); // session.hydrated === false, theme still the "system" default
    render(
      <Provider store={store}>
        <ThemeSync />
      </Provider>,
    );
    expect(theme()).toBe('dark');
  });
});
