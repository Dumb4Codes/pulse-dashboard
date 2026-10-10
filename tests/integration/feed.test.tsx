import userEvent from '@testing-library/user-event';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { LazyMotion, domMax } from 'framer-motion';
import { http, HttpResponse } from 'msw';
import FeedPage from '@/app/(dashboard)/page';
import { useLiveFeed } from '@/hooks/useLiveFeed';
import type { ContentItem } from '@/lib/types';
import { liveReceived } from '@/store/slices/live';
import { DEFAULT_PREFERENCES } from '@/store/slices/preferences';
import { renderWithStore } from '../helpers';
import { makeItem, pageOf, server, mockFeedResponses } from '../msw';

/** The dashboard layout provides LazyMotion (ShellMotion); presence animations need its features. */
function Page() {
  return (
    <LazyMotion features={domMax}>
      <FeedPage />
    </LazyMotion>
  );
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

/** Captures every observer the feed creates so a test can "scroll" by invoking its callback. */
class MockIntersectionObserver {
  static all: MockIntersectionObserver[] = [];
  readonly observed = new Set<Element>();
  constructor(
    readonly callback: IntersectionObserverCallback,
    readonly options?: IntersectionObserverInit,
  ) {
    MockIntersectionObserver.all.push(this);
  }
  observe = (el: Element) => void this.observed.add(el);
  unobserve = (el: Element) => void this.observed.delete(el);
  disconnect = () => this.observed.clear();
  takeRecords = () => [];

  /**
   * How many non-link elements are being watched (in practice: the feed's sentinel). `next/link` also
   * registers its anchors here under vitest, where it resolves to the pages-router shim that watches
   * every link for viewport prefetching; a real App Router build skips that for `prefetch={false}`
   * links, and none of it is the sentinel these tests are about.
   */
  static observedCount() {
    return MockIntersectionObserver.all.reduce(
      (n, io) => n + [...io.observed].filter((el) => el.tagName !== 'A').length,
      0,
    );
  }
  /** The sentinel scrolls into view (`times` notifications delivered before React can re-render). */
  static hit(times = 1) {
    act(() => {
      for (let n = 0; n < times; n++) {
        for (const io of MockIntersectionObserver.all) {
          for (const target of io.observed) {
            io.callback(
              [{ isIntersecting: true, target } as unknown as IntersectionObserverEntry],
              io as unknown as IntersectionObserver,
            );
          }
        }
      }
    });
  }
}

beforeEach(() => {
  MockIntersectionObserver.all = [];
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  vi.stubGlobal('scrollTo', vi.fn());
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const articleNames = () => screen.queryAllByRole('article').map((a) => a.getAttribute('aria-labelledby'))
  .map((id) => document.getElementById(id ?? '')?.textContent);
const handles = () => screen.getAllByRole('button', { name: 'Drag to reorder' });
/** The polite live region that announces keyboard moves. */
const announcer = () => document.querySelector<HTMLElement>('[data-feed-announcer]');

const mockThreeSources = () =>
  mockFeedResponses({ news: pageOf(2, 'news'), movies: pageOf(2, 'movie'), social: pageOf(2, 'post') });

describe('Feed page: loading and content', () => {
  it('shows skeletons while loading, then items from all three sources interleaved', async () => {
    mockThreeSources();
    const { container } = renderWithStore(<Page />);

    expect(container.querySelectorAll('[data-skeleton-card]').length).toBeGreaterThan(0);
    expect(screen.getByText('Loading content…')).toBeInTheDocument();

    await screen.findByText('Title news-0');
    expect(container.querySelector('[data-skeleton-card]')).toBeNull();

    expect(articleNames()).toEqual([
      'Title news-0', 'Title movie-0', 'Title post-0', 'Title news-1', 'Title movie-1', 'Title post-1',
    ]);
    const cards = screen.getAllByRole('article');
    expect(within(cards[0]).getByText('News')).toBeInTheDocument();
    expect(within(cards[1]).getByText('Movie')).toBeInTheDocument();
    expect(within(cards[2]).getByText('Post')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Your feed' })).toBeInTheDocument();
  });

  it('empty: all three sources return nothing -> "Nothing here yet", no skeletons, no error', async () => {
    mockFeedResponses({});
    const { container } = renderWithStore(<Page />);

    expect(await screen.findByText('Nothing here yet')).toBeInTheDocument();
    expect(container.querySelector('[data-skeleton-card]')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText(/all caught up/i)).toBeNull();
  });

  it('error: all three fail -> blocking alert; retry with fixed handlers shows items', async () => {
    mockFeedResponses({ news: 500, movies: 500, social: 500 });
    const user = userEvent.setup();
    renderWithStore(<Page />);

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText("We couldn't load your feed")).toBeInTheDocument();
    expect(screen.queryAllByRole('article')).toHaveLength(0);

    mockThreeSources();
    await user.click(within(alert).getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Title news-0')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('partial failure: movies 500 -> the rest is shown, no blocking alert, a non-blocking retry notice', async () => {
    mockFeedResponses({ news: pageOf(2, 'news'), movies: 500, social: pageOf(2, 'post') });
    renderWithStore(<Page />);

    expect(await screen.findByText('Title news-0')).toBeInTheDocument();
    expect(screen.getByText('Title post-0')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.getByText(/couldn't be loaded/i)).toBeInTheDocument();
  });
});

describe('Feed page: infinite scroll', () => {
  it('requests page 2 when the sentinel is reached, appends it and does not duplicate repeated ids', async () => {
    const newsPages: number[] = [];
    mockFeedResponses({
      news: (page) => {
        newsPages.push(page);
        // Page 2 repeats news-2 (already on page 1) next to a genuinely new story.
        return page === 1
          ? pageOf(3, 'news', { nextPage: 2 })
          : { ...pageOf(2, 'news', { start: 2 }), nextPage: null };
      },
    });
    renderWithStore(<Page />);

    await screen.findByText('Title news-2');
    expect(MockIntersectionObserver.observedCount()).toBeGreaterThan(0);
    expect(MockIntersectionObserver.all[0].options?.rootMargin).toBe('400px');
    expect(newsPages).toEqual([1]);

    MockIntersectionObserver.hit();

    expect(await screen.findByText('Title news-3')).toBeInTheDocument();
    expect(newsPages).toEqual([1, 2]);
    expect(screen.getAllByText('Title news-2')).toHaveLength(1);
    expect(screen.getAllByRole('article')).toHaveLength(4);
  });

  it('shows "Loading more…" while the next page is in flight and ignores a second hit', async () => {
    const newsPages: number[] = [];
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    // Hold page 2 open so the loading state is observable.
    server.use(
      http.get('*/api/news', async ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get('page'));
        newsPages.push(page);
        if (page === 2) await gate;
        return HttpResponse.json(page === 1 ? pageOf(2, 'news', { nextPage: 2 }) : pageOf(1, 'news', { start: 2 }));
      }),
      http.get('*/api/movies', () => HttpResponse.json(pageOf(0, 'movie'))),
      http.get('*/api/social', () => HttpResponse.json(pageOf(0, 'post'))),
    );
    renderWithStore(<Page />);
    await screen.findByText('Title news-1');

    MockIntersectionObserver.hit(3);
    expect(await screen.findByText('Loading more…')).toBeInTheDocument();
    MockIntersectionObserver.hit();

    release();
    expect(await screen.findByText('Title news-2')).toBeInTheDocument();
    expect(screen.queryByText('Loading more…')).toBeNull();
    expect(newsPages.filter((p) => p === 2)).toHaveLength(1);
    expect(newsPages.some((p) => p > 2)).toBe(false);
  });

  it('end reached: every source is on its last page -> "You\'re all caught up", sentinel not observed', async () => {
    mockThreeSources();
    renderWithStore(<Page />);

    expect(await screen.findByText(/all caught up/i)).toBeInTheDocument();
    expect(MockIntersectionObserver.observedCount()).toBe(0);
  });

  it('a failed next page is not skipped: it stops auto-loading, offers a retry, and retry fetches the same page', async () => {
    const newsPages: number[] = [];
    let failures = 1;
    const news = (page: number) => {
      newsPages.push(page);
      if (page === 2 && failures-- > 0) return 500;
      return page === 1 ? pageOf(2, 'news', { nextPage: 2 }) : pageOf(2, 'news', { start: 2 });
    };
    mockFeedResponses({ news });
    const user = userEvent.setup();
    renderWithStore(<Page />);
    await screen.findByText('Title news-1');

    MockIntersectionObserver.hit();
    const retry = await screen.findByRole('button', { name: 'Try again' });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(MockIntersectionObserver.observedCount()).toBe(0);

    await user.click(retry);
    expect(await screen.findByText('Title news-3')).toBeInTheDocument();
    expect(newsPages).toEqual([1, 2, 2]);
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
  });
});

describe('Feed page: order', () => {
  it('applies the saved order and ignores saved ids that are not in the feed', async () => {
    mockFeedResponses({ news: { items: [makeItem('a'), makeItem('b'), makeItem('c')], nextPage: null, source: 'mock' } });
    renderWithStore(<Page />, { preloaded: { feedOrder: { ids: ['zzz', 'b', 'a'] } } });

    await screen.findByText('Title b');
    expect(articleNames()).toEqual(['Title b', 'Title a', 'Title c']);
  });

  it('every card has a labelled drag handle described by keyboard instructions', async () => {
    mockThreeSources();
    renderWithStore(<Page />);
    await screen.findByText('Title news-0');

    expect(handles()).toHaveLength(6);
    for (const handle of handles()) {
      expect(handle).toHaveAccessibleDescription('Press the up or down arrow key to move this item.');
    }
  });

  it('ArrowUp on the handle of item 2 moves it to the top: store updated, announced politely, focus kept', async () => {
    mockThreeSources();
    const user = userEvent.setup();
    const { store } = renderWithStore(<Page />);
    await screen.findByText('Title news-0');

    const second = handles()[1]; // movie-0
    second.focus();
    await user.keyboard('{ArrowUp}');

    await waitFor(() => expect(store.getState().feedOrder.ids[0]).toBe('movie-0'));
    expect(store.getState().feedOrder.ids).toEqual(['movie-0', 'news-0', 'post-0', 'news-1', 'movie-1', 'post-1']);
    expect(articleNames()[0]).toBe('Title movie-0');

    const live = announcer();
    expect(live).toHaveAttribute('aria-live', 'polite');
    expect(live).toHaveTextContent('Moved Title movie-0 to position 1 of 6');
    await waitFor(() => expect(handles()[0]).toHaveFocus());
  });

  it('ArrowDown moves an item down, keeps focus on its handle, and prevents page scroll', async () => {
    mockThreeSources();
    const user = userEvent.setup();
    const { store } = renderWithStore(<Page />);
    await screen.findByText('Title news-0');

    handles()[0].focus();
    // fireEvent returns false when the default action was prevented (so the page does not scroll).
    expect(fireEvent.keyDown(handles()[0], { key: 'ArrowDown' })).toBe(false);

    await waitFor(() => expect(store.getState().feedOrder.ids.slice(0, 2)).toEqual(['movie-0', 'news-0']));
    expect(announcer()).toHaveTextContent('Moved Title news-0 to position 2 of 6');
    await waitFor(() => expect(handles()[1]).toHaveFocus());

    await user.keyboard('{ArrowDown}');
    await waitFor(() => expect(store.getState().feedOrder.ids.slice(0, 3)).toEqual(['movie-0', 'post-0', 'news-0']));
    expect(announcer()).toHaveTextContent('Moved Title news-0 to position 3 of 6');
    await waitFor(() => expect(handles()[2]).toHaveFocus());
  });

  it('at the edges nothing is dispatched and the user is told why', async () => {
    mockThreeSources();
    const { store } = renderWithStore(<Page />);
    await screen.findByText('Title news-0');

    fireEvent.keyDown(handles()[0], { key: 'ArrowUp' });
    expect(announcer()).toHaveTextContent('Title news-0 is already first');
    fireEvent.keyDown(handles()[5], { key: 'ArrowDown' });
    expect(announcer()).toHaveTextContent('Title post-1 is already last');
    expect(store.getState().feedOrder.ids).toEqual([]);
  });

  it('other keys leave the handle alone', async () => {
    mockThreeSources();
    const { store } = renderWithStore(<Page />);
    await screen.findByText('Title news-0');

    expect(fireEvent.keyDown(handles()[1], { key: 'a' })).toBe(true);
    expect(fireEvent.keyDown(handles()[1], { key: 'Tab' })).toBe(true);
    expect(store.getState().feedOrder.ids).toEqual([]);
  });
});

describe('Feed page: quick category filter', () => {
  it('toggling a chip writes to the store and refetches page 1 with the new categories', async () => {
    const seen: { page: string | null; categories: string | null }[] = [];
    server.use(
      http.get('*/api/news', ({ request }) => {
        const sp = new URL(request.url).searchParams;
        seen.push({ page: sp.get('page'), categories: sp.get('categories') });
        return HttpResponse.json(pageOf(2, 'news', { nextPage: 2 }));
      }),
      http.get('*/api/movies', () => HttpResponse.json(pageOf(0, 'movie'))),
      http.get('*/api/social', () => HttpResponse.json(pageOf(0, 'post'))),
    );
    const user = userEvent.setup();
    const { store } = renderWithStore(<Page />);
    await screen.findByText('Title news-1');
    MockIntersectionObserver.hit();
    await waitFor(() => expect(seen.map((s) => s.page)).toEqual(['1', '2']));

    const group = screen.getByRole('group', { name: 'Categories' });
    expect(within(group).getByRole('button', { name: 'Technology' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(within(group).getByRole('button', { name: 'Science' }));

    expect(store.getState().preferences.categories).toContain('science');
    await waitFor(() => expect(seen.at(-1)).toEqual({ page: '1', categories: 'technology,sports,finance,science' }));
    expect(within(group).getByRole('button', { name: 'Science' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('the last selected category cannot be removed: the store is unchanged and the reason is shown', async () => {
    mockThreeSources();
    const user = userEvent.setup();
    const { store } = renderWithStore(<Page />, {
      preloaded: { preferences: { ...DEFAULT_PREFERENCES, categories: ['technology', 'sports'] } },
    });
    await screen.findByText('Title news-0');
    const reason = 'Keep at least one category selected.';
    expect(screen.queryByText(reason)).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Sports' }));
    expect(store.getState().preferences.categories).toEqual(['technology']);
    expect(await screen.findByText(reason)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Technology' }));
    expect(store.getState().preferences.categories).toEqual(['technology']);
    expect(screen.getByRole('button', { name: 'Technology' })).toHaveAttribute('aria-disabled', 'true');

    await user.click(screen.getByRole('button', { name: 'Health' }));
    await waitFor(() => expect(screen.queryByText(reason)).toBeNull());
    expect(store.getState().preferences.categories).toEqual(['technology', 'health']);
  });
});

describe('Feed page: live updates', () => {
  const live = (id: string, title: string): ContentItem => makeItem(id, { title, type: 'social' });

  it('a pushed item raises "1 new item"; clicking it puts the item first and removes the pill', async () => {
    mockThreeSources();
    const user = userEvent.setup();
    const { store } = renderWithStore(<Page />);
    await screen.findByText('Title news-0');
    expect(screen.queryByRole('button', { name: /new item/ })).toBeNull();

    act(() => {
      store.dispatch(liveReceived(live('live-1', 'Breaking story')));
    });
    const pill = await screen.findByRole('button', { name: '1 new item' });
    // The status region exists before the pill does, so assistive tech announces its arrival.
    expect(pill.closest('[role="status"]')).not.toBeNull();
    // Still pending: the list has not changed under the reader.
    expect(screen.queryByText('Breaking story')).toBeNull();

    await user.click(pill);

    await waitFor(() => expect(articleNames()[0]).toBe('Breaking story'));
    await waitFor(() => expect(screen.queryByRole('button', { name: /new item/ })).toBeNull());
    expect(window.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
  });

  it('live items outside the selected categories neither raise the pill nor reach the feed', async () => {
    mockThreeSources();
    const user = userEvent.setup();
    // Default preferences: technology, sports, finance. makeItem defaults to technology.
    const { store } = renderWithStore(<Page />);
    await screen.findByText('Title news-0');

    act(() => {
      store.dispatch(liveReceived({ ...live('live-health', 'Health story'), category: 'health' }));
    });
    expect(screen.queryByRole('button', { name: /new item/ })).toBeNull();

    act(() => {
      store.dispatch(liveReceived(live('live-tech', 'Tech story')));
    });
    // Only the technology item counts, even though both are waiting in the store.
    await user.click(await screen.findByRole('button', { name: '1 new item' }));
    await waitFor(() => expect(articleNames()[0]).toBe('Tech story'));
    expect(screen.queryByText('Health story')).toBeNull();
    // Hidden, not discarded: the store keeps it so selecting health later would bring it back.
    expect(store.getState().live.injected.map((i) => i.id).sort()).toEqual(['live-health', 'live-tech']);
  });

  it('a flushed live item reappears when its category is selected again, and hides when deselected', async () => {
    mockThreeSources();
    const user = userEvent.setup();
    const { store } = renderWithStore(<Page />);
    await screen.findByText('Title news-0');

    act(() => {
      store.dispatch(liveReceived(live('live-1', 'Tech story')));
    });
    await user.click(await screen.findByRole('button', { name: '1 new item' }));
    await waitFor(() => expect(articleNames()[0]).toBe('Tech story'));

    // Leave technology (sports and finance stay selected): the item goes with it.
    await user.click(screen.getByRole('button', { name: 'Technology' }));
    await waitFor(() => expect(screen.queryByText('Tech story')).toBeNull());

    await user.click(screen.getByRole('button', { name: 'Technology' }));
    expect(await screen.findByText('Tech story')).toBeInTheDocument();
  });

  it('pluralises the pill and keeps newest first', async () => {
    mockThreeSources();
    const user = userEvent.setup();
    const { store } = renderWithStore(<Page />);
    await screen.findByText('Title news-0');

    act(() => {
      store.dispatch(liveReceived(live('live-1', 'First')));
      store.dispatch(liveReceived(live('live-2', 'Second')));
    });
    await user.click(await screen.findByRole('button', { name: '2 new items' }));

    await waitFor(() => expect(articleNames().slice(0, 3)).toEqual(['Second', 'First', 'Title news-0']));
  });

  it('flushed live items stay at the top even when the user already saved an order', async () => {
    mockThreeSources();
    const user = userEvent.setup();
    const { store } = renderWithStore(<Page />, {
      preloaded: { feedOrder: { ids: ['post-1', 'post-0', 'movie-1'] } },
    });
    await screen.findByText('Title post-1');

    act(() => {
      store.dispatch(liveReceived(live('live-9', 'Fresh')));
    });
    await user.click(await screen.findByRole('button', { name: '1 new item' }));

    await waitFor(() => expect(articleNames()[0]).toBe('Fresh'));
    expect(articleNames().slice(1, 4)).toEqual(['Title post-1', 'Title post-0', 'Title movie-1']);
  });

  it('a live item the user has dragged keeps the position they gave it', async () => {
    mockThreeSources();
    const user = userEvent.setup();
    const { store } = renderWithStore(<Page />);
    await screen.findByText('Title news-0');

    act(() => {
      store.dispatch(liveReceived(live('live-1', 'Fresh')));
    });
    await user.click(await screen.findByRole('button', { name: '1 new item' }));
    await waitFor(() => expect(articleNames()[0]).toBe('Fresh'));

    handles()[0].focus();
    await user.keyboard('{ArrowDown}');
    await waitFor(() => expect(articleNames().slice(0, 2)).toEqual(['Title news-0', 'Fresh']));
  });
});

describe('useLiveFeed', () => {
  class FakeEventSource {
    static all: FakeEventSource[] = [];
    onmessage: ((event: MessageEvent<string>) => void) | null = null;
    closed = false;
    constructor(readonly url: string) {
      FakeEventSource.all.push(this);
    }
    close() {
      this.closed = true;
    }
    emit(data: string) {
      act(() => this.onmessage?.({ data } as MessageEvent<string>));
    }
  }

  function Probe() {
    useLiveFeed();
    return null;
  }

  beforeEach(() => {
    FakeEventSource.all = [];
    vi.stubGlobal('EventSource', FakeEventSource);
  });

  it('opens /api/stream, dispatches each valid item, and closes on unmount', () => {
    const { store, unmount } = renderWithStore(<Probe />);
    expect(FakeEventSource.all).toHaveLength(1);
    expect(FakeEventSource.all[0].url).toBe('/api/stream');

    FakeEventSource.all[0].emit(JSON.stringify(makeItem('live-1')));
    expect(store.getState().live.pending.map((i) => i.id)).toEqual(['live-1']);

    unmount();
    expect(FakeEventSource.all[0].closed).toBe(true);
  });

  it('ignores malformed JSON and payloads that are not content items', () => {
    const { store } = renderWithStore(<Probe />);
    const source = FakeEventSource.all[0];

    source.emit('not json');
    source.emit('null');
    source.emit('42');
    source.emit(JSON.stringify({ id: 'x' }));
    source.emit(JSON.stringify({ ...makeItem('live-2'), type: 'podcast' }));
    expect(store.getState().live.pending).toEqual([]);

    source.emit(JSON.stringify(makeItem('live-3')));
    expect(store.getState().live.pending).toHaveLength(1);
  });

  it('does nothing where EventSource does not exist', () => {
    vi.unstubAllGlobals();
    expect(() => renderWithStore(<Probe />)).not.toThrow();
  });
});
