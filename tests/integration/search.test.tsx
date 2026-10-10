import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { Header } from '@/components/Header';
import { SearchPalette } from '@/components/SearchPalette';
import type { RootState } from '@/store';
import type { SearchResult } from '@/store/api';
import { DEFAULT_PREFERENCES } from '@/store/slices/preferences';
import { renderWithStore } from '../helpers';
import { makeItem, server } from '../msw';

const push = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ replace: vi.fn(), push, refresh: vi.fn(), prefetch: vi.fn() }),
}));

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
  // Testing Library only drives a fake clock through its async helpers (waitFor / findBy*) when it
  // sees a `jest` global, so give it the one function it calls.
  Object.assign(globalThis, { jest: { advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms) } });
});
afterAll(() => {
  server.close();
  Reflect.deleteProperty(globalThis, 'jest');
});
beforeEach(() => {
  push.mockClear();
  // Only the timers the debounce (and MSW's `delay`) use; promises and the DOM stay real.
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
});
afterEach(() => {
  server.resetHandlers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const MIN_CHARS_HINT = 'Type at least 2 characters to search.';

const RESULTS: SearchResult = {
  news: [
    makeItem('news-0', {
      title: 'React Compiler: why teams react',
      description: 'Memoization without the ceremony.',
      source: 'Dev Wire',
    }),
    makeItem('news-1', { title: 'Reactive design tokens', description: '' }),
  ],
  movies: [makeItem('movie-0', { type: 'movie', category: 'entertainment', title: 'The Reactor', source: 'Cinema' })],
  social: [
    makeItem('post-0', {
      type: 'social',
      title: 'react tips thread',
      image: 'https://img.example.com/post-0.png',
    }),
  ],
};
const EMPTY: SearchResult = { news: [], movies: [], social: [] };

type Reply = SearchResult | number | 'network';

/** Answers GET /api/search; returns the list of `q` values it was asked for, in order. */
function mockSearch(respond: (q: string, call: number) => Reply | Promise<Reply>): string[] {
  const calls: string[] = [];
  server.use(
    http.get('*/api/search', async ({ request }) => {
      const q = new URL(request.url).searchParams.get('q') ?? '';
      calls.push(q);
      const reply = await respond(q, calls.length);
      if (reply === 'network') return HttpResponse.error();
      if (typeof reply === 'number') return HttpResponse.json({ error: 'boom' }, { status: reply });
      return HttpResponse.json(reply);
    }),
  );
  return calls;
}

/** A trigger button that owns `open` state, like the header does, plus a control after the palette in DOM order. */
function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open search
      </button>
      <SearchPalette open={open} onClose={() => setOpen(false)} />
      <button type="button">After palette</button>
    </>
  );
}

const newUser = () => userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms), delay: 20 });
const advance = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

async function openPalette(preloaded?: Partial<RootState>) {
  const user = newUser();
  const { store } = renderWithStore(<Harness />, { preloaded });
  const trigger = screen.getByRole('button', { name: 'Open search' });
  await user.click(trigger);
  const dialog = screen.getByRole('dialog');
  const input = within(dialog).getByRole('combobox');
  return { user, trigger, dialog, input, store };
}

/** Types, waits out the debounce and lets the response land. */
async function searchFor(user: ReturnType<typeof newUser>, text: string) {
  await user.keyboard(text);
  await advance(400);
  await screen.findByRole('listbox');
}

describe('Search palette: debounce and request rules', () => {
  it('five quick keystrokes make exactly one request, 300 ms after the last', async () => {
    const calls = mockSearch(() => RESULTS);
    const { user } = await openPalette();

    await user.keyboard('react'); // 20 ms between keys: the timer keeps restarting
    await advance(250);
    expect(calls).toEqual([]);

    await advance(100); // past 300 ms since the last key
    await waitFor(() => expect(calls).toEqual(['react']));
    expect(await screen.findByRole('listbox')).toBeInTheDocument();

    await advance(2000);
    expect(calls).toEqual(['react']); // never 'r', 're', 'rea', 'reac'
  });

  it('sends the trimmed query, and trailing spaces do not trigger another request', async () => {
    const calls = mockSearch(() => RESULTS);
    const { user } = await openPalette();
    await searchFor(user, '  react  ');
    expect(calls).toEqual(['react']);

    await user.keyboard('   ');
    await advance(1000);
    expect(calls).toEqual(['react']);
  });

  it('shows the hint and makes no request for an empty field', async () => {
    const calls = mockSearch(() => RESULTS);
    await openPalette();
    await advance(1000);
    expect(calls).toEqual([]);
    expect(screen.getByText(MIN_CHARS_HINT)).toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it.each([['r'], ['   '], ['  r  '], [' \t ']])('makes no request for %j (under 2 characters once trimmed)', async (text) => {
    const calls = mockSearch(() => RESULTS);
    const { user } = await openPalette();
    await user.keyboard(text);
    await advance(1000);
    expect(calls).toEqual([]);
    expect(screen.getByText(MIN_CHARS_HINT)).toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('drops back to the hint at once when the query shrinks below 2 characters', async () => {
    const calls = mockSearch(() => RESULTS);
    const { user } = await openPalette();
    await searchFor(user, 'react');

    await user.keyboard('{Backspace}{Backspace}{Backspace}{Backspace}');
    expect(screen.getByText(MIN_CHARS_HINT)).toBeInTheDocument(); // no waiting for the debounce
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    await advance(1000);
    expect(calls).toEqual(['react']);
  });

  it('caps the field at 100 characters (the server clamps there too)', async () => {
    mockSearch(() => RESULTS);
    const { input } = await openPalette();
    fireEvent.change(input, { target: { value: 'x'.repeat(500) } });
    expect(input).toHaveAttribute('maxlength', '100');
  });
});

describe('Search palette: results', () => {
  it('groups results under News / Movies / Posts, in that order, and leaves empty groups out', async () => {
    mockSearch(() => ({ ...RESULTS, movies: [] }));
    const { user } = await openPalette();
    await searchFor(user, 'react');

    const listbox = screen.getByRole('listbox', { name: 'Search results' });
    const groups = within(listbox).getAllByRole('group');
    expect(groups.map((g) => g.getAttribute('aria-labelledby')).map((id) => document.getElementById(id ?? '')?.textContent)).toEqual([
      'News',
      'Posts',
    ]);
    expect(within(screen.getByRole('group', { name: 'News' })).getAllByRole('option')).toHaveLength(2);
    expect(within(screen.getByRole('group', { name: 'Posts' })).getAllByRole('option')).toHaveLength(1);
    expect(screen.queryByRole('group', { name: 'Movies' })).not.toBeInTheDocument();
  });

  it('highlights matches with <mark> text nodes, keeping the original casing', async () => {
    mockSearch(() => RESULTS);
    const { user } = await openPalette();
    await searchFor(user, 'REACT');

    const marksIn = (name: RegExp) =>
      Array.from(screen.getByRole('option', { name }).querySelectorAll('mark')).map((m) => m.textContent);
    expect(marksIn(/React Compiler/)).toEqual(['React', 'react']);
    expect(marksIn(/Reactive design tokens/)).toEqual(['React']);
    expect(marksIn(/The Reactor/)).toEqual(['React']);
    expect(marksIn(/react tips thread/)).toEqual(['react']);
    // The sentence around a match stays intact.
    expect(screen.getByRole('option', { name: /React Compiler/ })).toHaveTextContent('React Compiler: why teams react');
  });

  it('highlights each word of a multi-word query', async () => {
    mockSearch(() => RESULTS);
    const { user } = await openPalette();
    await searchFor(user, 'teams compiler');
    const option = screen.getByRole('option', { name: /React Compiler/ });
    expect(Array.from(option.querySelectorAll('mark')).map((m) => m.textContent)).toEqual(['Compiler', 'teams']);
  });

  it('crops a long description to start just before its first match, so the hit stays visible', async () => {
    const description =
      'A very long preamble about unrelated things that goes on and on and on before it finally mentions react at the end.';
    mockSearch(() => ({ ...EMPTY, news: [makeItem('news-long', { title: 'Plain title', description })] }));
    const { user } = await openPalette();
    await searchFor(user, 'react');

    const option = screen.getByRole('option');
    const marks = option.querySelectorAll('mark');
    expect(marks).toHaveLength(1);
    expect(marks[0]).toHaveTextContent('react');
    expect(option).toHaveTextContent('…'); // cropped
    expect(option).not.toHaveTextContent('A very long preamble');
    expect(option).toHaveTextContent('react at the end.');
  });

  it('renders titles as text: HTML coming back from the API is never parsed', async () => {
    mockSearch(() => ({
      ...EMPTY,
      news: [makeItem('news-x', { title: '<img src=x onerror=alert(1)> react', description: '<b>bold</b>' })],
    }));
    const { user } = await openPalette();
    await searchFor(user, 'react');

    expect(document.querySelector('img[src="x"]')).toBeNull();
    expect(document.querySelector('b')).toBeNull();
    expect(screen.getByRole('option')).toHaveTextContent('<img src=x onerror=alert(1)> react');
    expect(screen.getByRole('option')).toHaveTextContent('<b>bold</b>');
  });

  it('survives regex characters in the query', async () => {
    mockSearch(() => RESULTS);
    const { input } = await openPalette();
    fireEvent.change(input, { target: { value: '.*(+[' } });
    await advance(400);
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
    expect(document.querySelectorAll('mark')).toHaveLength(0);
  });

  it('keeps results whose own link is unusable: they open the details page, never that URL', async () => {
    mockSearch(() => ({
      ...EMPTY,
      news: [
        makeItem('news-bad', { title: 'react trap', url: 'javascript:alert(1)' }),
        makeItem('news-ok', { title: 'react fine' }),
      ],
    }));
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const { user } = await openPalette();
    await searchFor(user, 'react');
    expect(screen.getAllByRole('option')).toHaveLength(2);

    await user.click(screen.getByRole('option', { name: /react trap/ }));
    expect(push).toHaveBeenCalledWith('/content/news-bad');
    expect(open).not.toHaveBeenCalled();
  });

  it('announces the number of results politely', async () => {
    mockSearch(() => RESULTS);
    const { user } = await openPalette();
    await searchFor(user, 'react');
    expect(screen.getByRole('status')).toHaveTextContent('4 results');
  });

  it('with no results, says so with the query as escaped text', async () => {
    mockSearch(() => EMPTY);
    const { user } = await openPalette();
    const query = '<script>alert(1)</script>';
    await user.keyboard(query);
    await advance(400);

    expect(await screen.findByText(`No results for “${query}”`)).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('shows the translated copy in Spanish', async () => {
    mockSearch(() => EMPTY);
    await openPalette({ preferences: { ...DEFAULT_PREFERENCES, language: 'es' } });
    expect(await screen.findByText('Escribe al menos 2 caracteres para buscar.')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Buscar' })).toBeInTheDocument();
  });

  it('starts empty every time it is opened', async () => {
    mockSearch(() => RESULTS);
    const { user, input } = await openPalette();
    await searchFor(user, 'react');
    await user.keyboard('{Escape}');

    await user.click(screen.getByRole('button', { name: 'Open search' }));
    expect(within(screen.getByRole('dialog')).getByRole('combobox')).toHaveValue('');
    expect(input).not.toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});

describe('Search palette: dialog semantics and keyboard', () => {
  it('is a labelled modal dialog with a combobox that controls a listbox', async () => {
    mockSearch(() => RESULTS);
    const { user, dialog, input } = await openPalette();

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('Search');
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).not.toHaveAttribute('aria-activedescendant');

    await searchFor(user, 'react');
    const listbox = screen.getByRole('listbox');
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(input).toHaveAttribute('aria-controls', listbox.id);
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(4);
    expect(input).toHaveAttribute('aria-activedescendant', options[0].id);
    expect(options.map((o) => o.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false', 'false']);
  });

  it('ArrowDown / ArrowUp move aria-activedescendant (wrapping) and focus stays in the field', async () => {
    mockSearch(() => RESULTS);
    const { user, input } = await openPalette();
    await searchFor(user, 'react');
    const options = screen.getAllByRole('option');
    const selected = () => options.findIndex((o) => o.getAttribute('aria-selected') === 'true');

    await user.keyboard('{ArrowDown}');
    expect(selected()).toBe(1);
    expect(input).toHaveAttribute('aria-activedescendant', options[1].id);
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(selected()).toBe(3);
    await user.keyboard('{ArrowDown}');
    expect(selected()).toBe(0); // wraps to the top
    await user.keyboard('{ArrowUp}');
    expect(selected()).toBe(3); // and back to the bottom
    await user.keyboard('{ArrowUp}');
    expect(selected()).toBe(2);
    expect(input).toHaveFocus();
  });

  it('Enter opens the selected result\'s details page, remembers the item, and closes the palette', async () => {
    mockSearch(() => RESULTS);
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const { user, trigger, store } = await openPalette();
    await searchFor(user, 'react');

    await user.keyboard('{ArrowDown}{Enter}');
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/content/news-1');
    expect(open).not.toHaveBeenCalled();
    // Saved first, so the details page can show it at once and again after a reload.
    expect(store.getState().recent.items.map((i) => i.id)).toEqual(['news-1']);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('Enter with the first result selected opens it; with nothing to open it does nothing', async () => {
    mockSearch(() => RESULTS);
    const { user } = await openPalette();

    await user.keyboard('{Enter}'); // empty field
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await searchFor(user, 'react');
    await user.keyboard('{Enter}');
    expect(push).toHaveBeenCalledWith('/content/news-0');
  });

  it('a new query starts on its first result again', async () => {
    const calls = mockSearch(() => RESULTS);
    const { user } = await openPalette();
    await searchFor(user, 'react');
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(screen.getAllByRole('option')[2]).toHaveAttribute('aria-selected', 'true');

    await user.keyboard(' tokens');
    await advance(400);
    await waitFor(() => expect(calls).toEqual(['react', 'react tokens']));
    await waitFor(() => expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true'));
  });

  it('hovering a result selects it and clicking opens it', async () => {
    mockSearch(() => RESULTS);
    const { user, input } = await openPalette();
    await searchFor(user, 'react');

    const reactor = screen.getByRole('option', { name: /The Reactor/ });
    await user.hover(reactor);
    expect(reactor).toHaveAttribute('aria-selected', 'true');
    expect(input).toHaveAttribute('aria-activedescendant', reactor.id);

    await user.click(reactor);
    expect(push).toHaveBeenCalledWith('/content/movie-0');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Escape closes and returns focus to the trigger', async () => {
    mockSearch(() => RESULTS);
    const { user, trigger } = await openPalette();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('Escape still closes after focus was lost to the page', async () => {
    const { user, trigger, input } = await openPalette();
    act(() => input.blur());
    expect(document.body).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('the close button and a click on the scrim both close it and return focus', async () => {
    const { user, trigger, dialog } = await openPalette();
    await user.click(within(dialog).getByRole('button', { name: 'Close search' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    await user.click(trigger);
    const scrim = screen.getByRole('dialog').previousElementSibling;
    expect(scrim).toBeInTheDocument();
    await user.click(scrim as Element);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('traps focus: Tab and Shift+Tab cycle inside the dialog', async () => {
    const { user, dialog, input } = await openPalette();
    const close = within(dialog).getByRole('button', { name: 'Close search' });
    const outside = screen.getByRole('button', { name: 'After palette' });

    expect(input).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
    await user.tab(); // would leave the dialog: wraps instead
    expect(input).toHaveFocus();
    await user.tab({ shift: true });
    expect(close).toHaveFocus();
    await user.tab({ shift: true });
    expect(input).toHaveFocus();
    expect(outside).not.toHaveFocus();
  });

  it('pulls focus back if it escapes the dialog', async () => {
    const { dialog, input } = await openPalette();
    act(() => screen.getByRole('button', { name: 'After palette' }).focus());
    expect(input).toHaveFocus();
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });

  it('locks page scroll while open and restores it on close', async () => {
    document.body.style.overflow = 'auto';
    const { user } = await openPalette();
    expect(document.body.style.overflow).toBe('hidden');
    await user.keyboard('{Escape}');
    expect(document.body.style.overflow).toBe('auto');
    document.body.style.overflow = '';
  });
});

describe('Search palette: failure and staleness', () => {
  it.each([[500], ['network' as const]])('a failing request (%s) shows an alert with a working Retry', async (failure) => {
    const calls = mockSearch((_q, call) => (call === 1 ? failure : RESULTS));
    const { user, input } = await openPalette();
    await user.keyboard('react');
    await advance(400);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Search is unavailable right now');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.queryByText('No results for “react”')).not.toBeInTheDocument();

    await user.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(input).toHaveFocus(); // the button unmounts: focus must not fall to <body>
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(calls).toEqual(['react', 'react']);
  });

  it('typing a new query after an error clears the alert and searches again', async () => {
    const calls = mockSearch((_q, call) => (call === 1 ? 500 : RESULTS));
    const { user } = await openPalette();
    await user.keyboard('react');
    await advance(400);
    await screen.findByRole('alert');

    await user.keyboard('!');
    await advance(400);
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
    expect(calls).toEqual(['react', 'react!']);
  });

  it('ignores a slow response for an older query: it cannot overwrite the newer results', async () => {
    const calls = mockSearch(async (q) => {
      if (q === 'react') {
        await delay(1000);
        return { ...EMPTY, news: [makeItem('news-old', { title: 'Stale react result' })] };
      }
      return { ...EMPTY, news: [makeItem('news-new', { title: 'Fresh reactive result' })] };
    });
    const { user } = await openPalette();

    await user.keyboard('react');
    await advance(350);
    await waitFor(() => expect(calls).toEqual(['react'])); // answer still on its way

    await user.keyboard('ive');
    await advance(350);
    expect(await screen.findByRole('option', { name: /Fresh reactive result/ })).toBeInTheDocument();
    expect(calls).toEqual(['react', 'reactive']);

    await advance(3000); // the slow answer for 'react' finally arrives
    expect(screen.queryByText(/Stale react result/)).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Fresh reactive result/ })).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(1);
  });

  it('shows skeleton rows (hidden from assistive tech) while the first answer is on its way', async () => {
    mockSearch(async () => {
      await delay(1000);
      return RESULTS;
    });
    const { user } = await openPalette();
    await user.keyboard('react');
    await advance(350);

    expect(screen.getByRole('status')).toHaveTextContent('Searching…');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(document.querySelectorAll('.skeleton').length).toBeGreaterThan(0);

    await advance(1500);
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
    expect(document.querySelectorAll('.skeleton')).toHaveLength(0);
  });
});

describe('Search palette inside the header', () => {
  it('"/" opens the lazy-loaded palette; Escape hands focus back to the header trigger', async () => {
    const calls = mockSearch(() => RESULTS);
    const user = newUser();
    renderWithStore(<Header />);
    const trigger = screen.getByRole('button', { name: 'Search news, movies, posts' });

    await user.keyboard('/');
    const dialog = await screen.findByRole('dialog', { name: 'Search' });
    expect(within(dialog).getByRole('combobox')).toHaveFocus();

    await user.keyboard('react');
    await advance(400);
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
    expect(calls).toEqual(['react']);

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
