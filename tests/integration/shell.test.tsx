import userEvent from '@testing-library/user-event';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { AccountMenu } from '@/components/AccountMenu';
import { Header, SkipLink } from '@/components/Header';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { MobileTabBar } from '@/components/MobileTabBar';
import { PageHeader } from '@/components/PageHeader';
import { Sidebar } from '@/components/Sidebar';
import { StoreHydrator } from '@/components/StoreHydrator';
import { ThemeToggle } from '@/components/ThemeToggle';
import { makeStore } from '@/store';
import { liveReceived } from '@/store/slices/live';
import { toggleFavorite } from '@/store/slices/favorites';
import { DEFAULT_PREFERENCES } from '@/store/slices/preferences';
import { setSessionEmail } from '@/store/slices/session';
import type { ContentItem } from '@/lib/types';
import { renderWithStore } from '../helpers';

const nav = vi.hoisted(() => ({
  pathname: '/',
  router: { replace: vi.fn(), push: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() },
}));
vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useRouter: () => nav.router,
}));
// Task 10 owns the real palette; the shell only has to mount it lazily and hand it { open, onClose }.
vi.mock('@/components/SearchPalette', () => ({
  SearchPalette: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? (
      <div role="dialog" aria-label="Search palette">
        <button onClick={onClose}>Close palette</button>
      </div>
    ) : null,
}));

const item = (id: string): ContentItem => ({
  id,
  type: 'news',
  category: 'technology',
  title: `Item ${id}`,
  description: '',
  image: '',
  url: 'https://example.com',
  source: 'Wire',
  publishedAt: '2026-10-08T00:00:00.000Z',
  score: 1,
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  nav.pathname = '/';
  nav.router.replace.mockClear();
  fetchMock = vi.fn().mockResolvedValue(json({ email: 'demo@pulse.dev' }));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete document.documentElement.dataset.theme;
});

describe('Sidebar', () => {
  it('is a labelled navigation landmark with the four destinations', () => {
    renderWithStore(<Sidebar />);
    const navigation = screen.getByRole('navigation', { name: 'Main navigation' });
    const links = within(navigation).getAllByRole('link');
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['/', '/trending', '/favorites', '/settings']);
    expect(links.map((l) => l.textContent)).toEqual(['Feed', 'Trending', 'Favorites', 'Settings']);
  });

  it.each([
    ['/', 'Feed'],
    ['/trending', 'Trending'],
    ['/trending/anything', 'Trending'],
    ['/favorites', 'Favorites'],
    ['/settings', 'Settings'],
  ])('marks exactly one link as the current page on %s', (pathname, label) => {
    nav.pathname = pathname;
    renderWithStore(<Sidebar />);
    const current = screen.getAllByRole('link', { current: 'page' });
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent(label);
  });

  it('keeps Feed inactive on other routes (the "/" match is exact)', () => {
    nav.pathname = '/settings';
    renderWithStore(<Sidebar />);
    expect(screen.getByRole('link', { name: 'Feed' })).not.toHaveAttribute('aria-current');
  });

  it('shows a favorites count badge only when there are favorites, and keeps it in sync', () => {
    const { store } = renderWithStore(<Sidebar />);
    const favorites = () => screen.getByRole('link', { name: /^Favorites/ });
    expect(within(favorites()).queryByText(/^\d+$/)).not.toBeInTheDocument();

    act(() => {
      store.dispatch(toggleFavorite(item('a')));
      store.dispatch(toggleFavorite(item('b')));
    });
    expect(within(favorites()).getByText('2')).toBeInTheDocument();

    act(() => {
      store.dispatch(toggleFavorite(item('a')));
    });
    expect(within(favorites()).getByText('1')).toBeInTheDocument();
  });

  it('live card shows the default line, then the pending count from the SSE slice', () => {
    const { store } = renderWithStore(<Sidebar />);
    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.getByText('Fresh stories stream in as they happen.')).toBeInTheDocument();

    act(() => {
      store.dispatch(liveReceived(item('x')));
    });
    expect(screen.getByText('1 new item')).toBeInTheDocument();
    expect(screen.queryByText('Fresh stories stream in as they happen.')).not.toBeInTheDocument();
  });
});

describe('MobileTabBar', () => {
  it('renders the same four destinations and marks the current page', () => {
    nav.pathname = '/favorites';
    renderWithStore(<MobileTabBar />);
    const navigation = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(within(navigation).getAllByRole('link')).toHaveLength(4);
    expect(within(navigation).getByRole('link', { current: 'page' })).toHaveTextContent('Favorites');
  });

  it('shows the favorites count', () => {
    const { store } = renderWithStore(<MobileTabBar />);
    act(() => {
      store.dispatch(toggleFavorite(item('a')));
    });
    expect(within(screen.getByRole('link', { name: /Favorites/ })).getByText('1')).toBeInTheDocument();
  });
});

describe('SkipLink', () => {
  it('is an in-page link to <main id="main"> with the translated label', () => {
    renderWithStore(<SkipLink />);
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main');
  });
});

describe('Header + search trigger', () => {
  it('renders the search trigger with the "/" hint, shortcut metadata and the three controls', () => {
    renderWithStore(<Header />);
    const trigger = screen.getByRole('button', { name: 'Search news, movies, posts' });
    expect(trigger).toHaveAttribute('aria-keyshortcuts', '/');
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveTextContent('Search news, movies, posts');
    expect(screen.getByRole('button', { name: 'Dark mode' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Language: English$/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Account menu' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); // palette not mounted until wanted
  });

  it('clicking the trigger lazily mounts the palette; closing it returns focus to the trigger', async () => {
    const user = userEvent.setup();
    renderWithStore(<Header />);
    const trigger = screen.getByRole('button', { name: 'Search news, movies, posts' });

    await user.click(trigger);
    const dialog = await screen.findByRole('dialog', { name: 'Search palette' });
    await user.click(within(dialog).getByRole('button', { name: 'Close palette' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it('"/" opens the palette when focus is on the page', async () => {
    const user = userEvent.setup();
    renderWithStore(<Header />);
    await user.keyboard('/');
    expect(await screen.findByRole('dialog', { name: 'Search palette' })).toBeInTheDocument();
  });

  it('Ctrl+K opens the palette, even from inside a text field', async () => {
    const user = userEvent.setup();
    renderWithStore(
      <>
        <input aria-label="Notes" />
        <Header />
      </>,
    );
    await user.click(screen.getByRole('textbox', { name: 'Notes' }));
    await user.keyboard('{Control>}k{/Control}');
    expect(await screen.findByRole('dialog', { name: 'Search palette' })).toBeInTheDocument();
  });

  it('"/" typed into a text field is just a character: no palette', async () => {
    const user = userEvent.setup();
    renderWithStore(
      <>
        <input aria-label="Notes" />
        <Header />
      </>,
    );
    await user.click(screen.getByRole('textbox', { name: 'Notes' }));
    await user.keyboard('a/b');
    expect(screen.getByRole('textbox', { name: 'Notes' })).toHaveValue('a/b');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('ThemeToggle', () => {
  it('reflects the resolved theme in aria-pressed and toggles light <-> dark in the store', async () => {
    const user = userEvent.setup();
    const { store } = renderWithStore(<ThemeToggle />, {
      preloaded: { preferences: { ...DEFAULT_PREFERENCES, theme: 'light' } },
    });
    const toggle = screen.getByRole('button', { name: 'Dark mode' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await user.click(toggle);
    expect(store.getState().preferences.theme).toBe('dark');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');

    await user.click(toggle);
    expect(store.getState().preferences.theme).toBe('light');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });

  it('while on "system" it follows the OS: dark OS means pressed, and a click goes explicitly light', async () => {
    const original = window.matchMedia;
    window.matchMedia = vi.fn(() => ({
      matches: true,
      media: '',
      addEventListener() {},
      removeEventListener() {},
    })) as unknown as typeof window.matchMedia;
    try {
      const user = userEvent.setup();
      const { store } = renderWithStore(<ThemeToggle />);
      const toggle = screen.getByRole('button', { name: 'Dark mode' });
      expect(store.getState().preferences.theme).toBe('system');
      expect(toggle).toHaveAttribute('aria-pressed', 'true');
      await user.click(toggle);
      expect(store.getState().preferences.theme).toBe('light');
    } finally {
      window.matchMedia = original;
    }
  });
});

describe('LanguageSwitch', () => {
  const trigger = () => screen.getByRole('button', { name: /^Language:/ });

  it('opens a menu of the three languages (named in their own script, with lang) with the current one checked', async () => {
    const user = userEvent.setup();
    renderWithStore(<LanguageSwitch />);
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    await user.click(trigger());

    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    const menu = screen.getByRole('menu');
    const options = within(menu).getAllByRole('menuitemradio');
    expect(options.map((o) => o.textContent)).toEqual(['English', 'हिन्दी', 'Español']);
    expect(options.map((o) => o.getAttribute('lang'))).toEqual(['en', 'hi', 'es']);
    expect(options.map((o) => o.getAttribute('aria-checked'))).toEqual(['true', 'false', 'false']);
    expect(options[0]).toHaveFocus(); // focus moves to the checked item
  });

  it('choosing Español updates the store and the UI language, closes the menu and returns focus', async () => {
    const user = userEvent.setup();
    const { store } = renderWithStore(
      <>
        <LanguageSwitch />
        <Sidebar />
      </>,
    );
    await user.click(trigger());
    await user.click(screen.getByRole('menuitemradio', { name: 'Español' }));

    expect(store.getState().preferences.language).toBe('es');
    expect(await screen.findByText('Favoritos')).toBeInTheDocument();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Idioma: Español' })).toHaveFocus();
    expect(document.documentElement.lang).toBe('es');
  });

  it('keyboard: ArrowDown opens, arrows/Home/End move with wrap, Escape closes and refocuses the trigger', async () => {
    const user = userEvent.setup();
    renderWithStore(<LanguageSwitch />);
    trigger().focus();
    await user.keyboard('{ArrowDown}');
    const [en, hi, es] = screen.getAllByRole('menuitemradio');
    expect(en).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(hi).toHaveFocus();
    await user.keyboard('{End}');
    expect(es).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(en).toHaveFocus(); // wraps
    await user.keyboard('{ArrowUp}');
    expect(es).toHaveFocus(); // wraps back
    await user.keyboard('{Home}');
    expect(en).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
  });

  it('ArrowUp on the trigger opens with the last item focused; a press outside closes without stealing focus', async () => {
    const user = userEvent.setup();
    renderWithStore(
      <>
        <LanguageSwitch />
        <button>elsewhere</button>
      </>,
    );
    trigger().focus();
    await user.keyboard('{ArrowUp}');
    expect(screen.getAllByRole('menuitemradio')[2]).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'elsewhere' }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'elsewhere' })).toHaveFocus();
  });

  it('Tab closes the menu and continues past the trigger', async () => {
    const user = userEvent.setup();
    renderWithStore(
      <>
        <LanguageSwitch />
        <button>next control</button>
      </>,
    );
    await user.click(trigger());
    await user.tab();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'next control' })).toHaveFocus();
  });
});

describe('AccountMenu', () => {
  const trigger = () => screen.getByRole('button', { name: 'Account menu' });

  it('shows the avatar initial; the menu lists name, email, a Settings link and Sign out', async () => {
    const user = userEvent.setup();
    const { store } = renderWithStore(<AccountMenu />);
    act(() => {
      store.dispatch(setSessionEmail('demo@pulse.dev'));
    });
    expect(trigger().querySelector('[aria-hidden="true"]')).toHaveTextContent('D'); // "Demo User"

    await user.click(trigger());
    const identity = screen.getByRole('group', { name: 'Profile' });
    expect(within(identity).getByText('Demo User')).toBeInTheDocument();
    expect(within(identity).getByText('demo@pulse.dev')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Settings' })).toHaveAttribute('href', '/settings');
    expect(screen.getByRole('menuitem', { name: 'Sign out' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Settings' })).toHaveFocus();
  });

  it('uses the profile name and colour from the store', async () => {
    renderWithStore(<AccountMenu />, {
      preloaded: {
        session: { hydrated: true, email: null, profile: { name: 'मीरा', avatarColor: '#fde047' } },
      },
    });
    const avatar = trigger().querySelector<HTMLElement>('[aria-hidden="true"]');
    expect(avatar).toHaveTextContent('म');
    expect(avatar?.style.backgroundColor).toBe('rgb(253, 224, 71)');
    expect(avatar).toHaveClass('text-black'); // light swatch gets dark text
  });

  it('Sign out POSTs /api/auth/logout, clears the session email and replaces the route with /login', async () => {
    fetchMock.mockResolvedValue(json({ ok: true }));
    const user = userEvent.setup();
    const { store } = renderWithStore(<AccountMenu />);
    act(() => {
      store.dispatch(setSessionEmail('demo@pulse.dev'));
    });
    await user.click(trigger());
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }));

    await waitFor(() => expect(nav.router.replace).toHaveBeenCalledWith('/login'));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/auth/logout');
    expect(init.method).toBe('POST');
    expect(store.getState().session.email).toBeNull();
    // Stays in the pending state while the page is replaced: no double submit.
    expect(screen.getByRole('menuitem', { name: 'Signing out…' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('a failed sign-out shows an alert, keeps the user signed in and allows a retry', async () => {
    fetchMock.mockResolvedValueOnce(json({ error: 'x' }, 500)).mockResolvedValueOnce(json({ ok: true }));
    const user = userEvent.setup();
    renderWithStore(<AccountMenu />);
    await user.click(trigger());
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not sign out. Please try again.');
    expect(nav.router.replace).not.toHaveBeenCalled();

    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }));
    await waitFor(() => expect(nav.router.replace).toHaveBeenCalledWith('/login'));
  });

  it('a network failure during sign-out is handled the same way', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const user = userEvent.setup();
    renderWithStore(<AccountMenu />);
    await user.click(trigger());
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(nav.router.replace).not.toHaveBeenCalled();
  });

  it('cannot be double-submitted while the request is in flight', async () => {
    let resolve: (r: Response) => void = () => {};
    fetchMock.mockReturnValue(new Promise<Response>((r) => { resolve = r; }));
    const user = userEvent.setup();
    renderWithStore(<AccountMenu />);
    await user.click(trigger());
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }));
    await user.click(screen.getByRole('menuitem', { name: 'Signing out…' }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolve(json({ ok: true }));
    await waitFor(() => expect(nav.router.replace).toHaveBeenCalledTimes(1));
  });

  it('Escape closes the menu and returns focus to the avatar button', async () => {
    const user = userEvent.setup();
    renderWithStore(<AccountMenu />);
    await user.click(trigger());
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
  });
});

describe('StoreHydrator', () => {
  function mount(path: string) {
    nav.pathname = path;
    const store = makeStore();
    render(
      <Provider store={store}>
        <StoreHydrator />
      </Provider>,
    );
    return store;
  }

  it('loads persisted preferences / profile from pulse:v1 and opens the persistence gate', async () => {
    localStorage.setItem(
      'pulse:v1',
      JSON.stringify({
        v: 1,
        preferences: { ...DEFAULT_PREFERENCES, language: 'hi', theme: 'dark' },
        profile: { name: 'Mira', avatarColor: '#112233' },
      }),
    );
    const store = mount('/trending');
    await waitFor(() => expect(store.getState().session.hydrated).toBe(true));
    expect(store.getState().preferences.language).toBe('hi');
    expect(store.getState().preferences.theme).toBe('dark');
    expect(store.getState().session.profile).toEqual({ name: 'Mira', avatarColor: '#112233' });
  });

  it('still hydrates (with defaults) when storage is empty or corrupt', async () => {
    localStorage.setItem('pulse:v1', '{not json');
    const store = mount('/');
    await waitFor(() => expect(store.getState().session.hydrated).toBe(true));
    expect(store.getState().preferences).toEqual(DEFAULT_PREFERENCES);
  });

  it('asks /api/auth/session who is signed in and stores the email', async () => {
    const store = mount('/');
    await waitFor(() => expect(store.getState().session.email).toBe('demo@pulse.dev'));
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/session', expect.objectContaining({ credentials: 'same-origin' }));
  });

  it('does not re-ask the server when the email is cleared (sign-out would only earn a 401)', async () => {
    const store = mount('/trending');
    await waitFor(() => expect(store.getState().session.email).toBe('demo@pulse.dev'));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    act(() => {
      store.dispatch(setSessionEmail(null));
    });
    await act(async () => {});
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(store.getState().session.email).toBeNull();
  });

  it('fetches the session when the user moves from /login into the app', async () => {
    nav.pathname = '/login';
    const store = makeStore();
    const tree = () => (
      <Provider store={store}>
        <StoreHydrator />
      </Provider>
    );
    const { rerender } = render(tree());
    await waitFor(() => expect(store.getState().session.hydrated).toBe(true));
    expect(fetchMock).not.toHaveBeenCalled();

    nav.pathname = '/';
    rerender(tree()); // fresh element: StoreHydrator re-reads usePathname()
    await waitFor(() => expect(store.getState().session.email).toBe('demo@pulse.dev'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not call the session endpoint on /login (nobody is signed in there)', async () => {
    const store = mount('/login');
    await waitFor(() => expect(store.getState().session.hydrated).toBe(true));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(store.getState().session.email).toBeNull();
  });

  it('ignores a 401, a malformed body and a network error', async () => {
    for (const reply of [
      () => Promise.resolve(json({ error: 'unauthenticated' }, 401)),
      () => Promise.resolve(json({ email: 42 })),
      () => Promise.resolve(new Response('<html>', { status: 200 })),
      () => Promise.reject(new TypeError('offline')),
    ]) {
      fetchMock.mockImplementationOnce(reply);
      const store = mount('/');
      await waitFor(() => expect(fetchMock).toHaveBeenCalled());
      await act(async () => {});
      expect(store.getState().session.email).toBeNull();
      expect(store.getState().session.hydrated).toBe(true);
      fetchMock.mockClear();
    }
  });
});

describe('PageHeader', () => {
  it('renders one h1 with the title, plus optional subtitle and actions', () => {
    render(<PageHeader title="Trending" subtitle="What is moving right now" actions={<button>Filter</button>} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Trending' })).toBeInTheDocument();
    expect(screen.getByText('What is moving right now')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Filter' })).toBeInTheDocument();
  });

  it('omits the optional parts when not given', () => {
    const { container } = render(<PageHeader title="Only a title" />);
    expect(container.querySelectorAll('p')).toHaveLength(0);
    expect(container.querySelectorAll('button')).toHaveLength(0);
  });

  it('renders HTML-looking titles as text', () => {
    render(<PageHeader title="<img src=x onerror=alert(1)>" />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('<img src=x onerror=alert(1)>');
    expect(document.querySelector('img')).toBeNull();
  });
});
