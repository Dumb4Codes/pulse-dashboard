import userEvent from '@testing-library/user-event';
import { act, screen, waitFor, within } from '@testing-library/react';
import { LazyMotion, domMax } from 'framer-motion';
import TrendingPage from '@/app/(dashboard)/trending/page';
import type { ContentItem, ContentType, Page } from '@/lib/types';
import { setLanguage } from '@/store/slices/preferences';
import { renderWithStore } from '../helpers';
import { makeItem, mockFeedResponses, pageOf, server } from '../msw';

function Motion() {
  return (
    <LazyMotion features={domMax}>
      <TrendingPage />
    </LazyMotion>
  );
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

/** `ids` get ascending-in-array-order items whose scores come from `scores` (same index). */
function scored(prefix: string, type: ContentType, scores: number[]): Page {
  const items: ContentItem[] = scores.map((score, i) => makeItem(`${prefix}-${i}`, { type, score }));
  return { items, nextPage: null, source: 'mock' };
}

/** Item titles in DOM order (the ranked list). */
const rankedTitles = () => screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);

describe('Trending page: ranking', () => {
  it('sorts the active tab by score (highest first) and keeps only the top 10', async () => {
    // 12 stories, scores deliberately unordered: 0 and 1 are the two lowest.
    const scores = [5, 3, 90, 41, 77, 12, 63, 28, 99, 50, 19, 84];
    mockFeedResponses({ news: scored('news', 'news', scores) });
    renderWithStore(<Motion />);

    await screen.findByRole('article', { name: 'Title news-8' });

    const expected = scores
      .map((score, i) => ({ score, title: `Title news-${i}` }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((x) => x.title);
    expect(rankedTitles()).toEqual(expected);
    expect(rankedTitles()).toHaveLength(10);
    expect(screen.queryByText('Title news-0')).toBeNull(); // score 5
    expect(screen.queryByText('Title news-1')).toBeNull(); // score 3

    // Rank 1 is the hero (highest score, 99).
    const hero = screen.getByRole('article', { name: 'Title news-8' });
    expect(hero).toHaveAttribute('data-rank', '1');
    expect(hero).toHaveAttribute('data-variant', 'hero');
  });

  it('lays out rank 1 as hero, 2-5 as tiles and 6-10 as a compact ordered list continuing at 6', async () => {
    mockFeedResponses({ news: scored('news', 'news', [100, 90, 80, 70, 60, 50, 40, 30, 20, 10]) });
    renderWithStore(<Motion />);
    await screen.findByRole('article', { name: 'Title news-0' });

    const variants = screen.getAllByRole('article').map((a) => `${a.getAttribute('data-rank')}:${a.getAttribute('data-variant')}`);
    expect(variants).toEqual([
      '1:hero',
      '2:tile',
      '3:tile',
      '4:tile',
      '5:tile',
      '6:row',
      '7:row',
      '8:row',
      '9:row',
      '10:row',
    ]);

    const lists = screen.getAllByRole('list');
    expect(lists).toHaveLength(2);
    expect(within(lists[0]).getAllByRole('article')).toHaveLength(5);
    expect(lists[1]).toHaveAttribute('start', '6');
    expect(lists[1]).toHaveAccessibleName('Also rising');
  });

  it('fewer than six items: no secondary list; a single item is still a valid board', async () => {
    mockFeedResponses({ news: scored('news', 'news', [7]) });
    renderWithStore(<Motion />);

    await screen.findByRole('article', { name: 'Title news-0' });
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getAllByRole('list')).toHaveLength(1);
  });

  it('every tile opens its details page, and has a labelled favorite button', async () => {
    mockFeedResponses({
      news: {
        items: [
          makeItem('ok', { score: 9, url: 'https://example.com/ok' }),
          makeItem('bad', { score: 8, url: 'javascript:alert(1)' }),
        ],
        nextPage: null,
        source: 'mock',
      },
    });
    renderWithStore(<Motion />);

    const ok = await screen.findByRole('article', { name: 'Title ok' });
    const link = within(ok).getByRole('link', { name: 'Title ok' });
    expect(link).toHaveAttribute('href', '/content/ok');
    expect(link).not.toHaveAttribute('target');
    expect(within(ok).getByRole('button', { name: 'Add to favorites' })).toBeInTheDocument();

    // The details page is the way in whatever the item's own URL is; the unsafe URL is never linked to.
    const bad = screen.getByRole('article', { name: 'Title bad' });
    expect(within(bad).getByRole('link', { name: 'Title bad' })).toHaveAttribute('href', '/content/bad');
    expect(document.querySelector('a[href^="javascript:"]')).toBeNull();
  });

  it('favoriting from a tile writes to the store', async () => {
    mockFeedResponses({ news: scored('news', 'news', [3, 2, 1]) });
    const user = userEvent.setup();
    const { store } = renderWithStore(<Motion />);

    const top = await screen.findByRole('article', { name: 'Title news-0' });
    await user.click(within(top).getByRole('button', { name: 'Add to favorites' }));

    expect(Object.keys(store.getState().favorites.byId)).toEqual(['news-0']);
    expect(within(top).getByRole('button', { name: 'Remove from favorites' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('Trending page: tabs', () => {
  it('is a labelled tablist with News / Movies / Posts; News is selected and owns the panel', async () => {
    mockFeedResponses({ news: pageOf(2, 'news'), movies: pageOf(2, 'movie'), social: pageOf(2, 'post') });
    renderWithStore(<Motion />);

    const tablist = screen.getByRole('tablist', { name: 'Trending by type' });
    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['News', 'Movies', 'Posts']);
    expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
    // Roving tabindex: only the selected tab is in the tab order.
    expect(tabs.map((t) => t.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);

    const panel = screen.getByRole('tabpanel');
    expect(panel).toHaveAccessibleName('News');
    expect(tabs[0]).toHaveAttribute('aria-controls', panel.id);
    expect(screen.getByRole('heading', { level: 1, name: 'Trending' })).toBeInTheDocument();
  });

  it('arrow keys move focus and selection (wrapping), Home/End jump; the panel swaps to that type', async () => {
    mockFeedResponses({ news: pageOf(2, 'news'), movies: pageOf(2, 'movie'), social: pageOf(2, 'post') });
    const user = userEvent.setup();
    renderWithStore(<Motion />);

    await screen.findByText('Title news-0');
    const [news, movies, posts] = screen.getAllByRole('tab');

    news.focus();
    await user.keyboard('{ArrowRight}');
    expect(movies).toHaveFocus();
    expect(movies).toHaveAttribute('aria-selected', 'true');
    expect(news).toHaveAttribute('aria-selected', 'false');
    expect(await screen.findByText('Title movie-0')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Title news-0')).toBeNull());
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('Movies');
    expect(within(screen.getByRole('article', { name: 'Title movie-0' })).getByText('Movie')).toBeInTheDocument();

    await user.keyboard('{End}');
    expect(posts).toHaveFocus();
    expect(await screen.findByText('Title post-0')).toBeInTheDocument();

    await user.keyboard('{ArrowRight}'); // wraps to News
    expect(news).toHaveFocus();
    expect(await screen.findByText('Title news-0')).toBeInTheDocument();

    await user.keyboard('{ArrowLeft}'); // wraps to Posts
    expect(posts).toHaveFocus();
    await user.keyboard('{Home}');
    expect(news).toHaveFocus();
    expect(news).toHaveAttribute('aria-selected', 'true');
  });

  it('clicking a tab selects it', async () => {
    mockFeedResponses({ news: pageOf(1, 'news'), social: pageOf(1, 'post') });
    const user = userEvent.setup();
    renderWithStore(<Motion />);

    await user.click(screen.getByRole('tab', { name: 'Posts' }));

    expect(screen.getByRole('tab', { name: 'Posts' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByText('Title post-0')).toBeInTheDocument();
  });
});

describe('Trending page: states', () => {
  it('shows a polite loading status with skeleton tiles, then the board', async () => {
    mockFeedResponses({ news: pageOf(3, 'news') });
    const { container } = renderWithStore(<Motion />);

    expect(screen.getByText('Loading content…')).toBeInTheDocument();
    expect(container.querySelector('[data-skeleton-tile]')).not.toBeNull();

    await screen.findByText('Title news-0');
    expect(container.querySelector('[data-skeleton-tile]')).toBeNull();
  });

  it('empty: nothing returned -> explains and points to Settings', async () => {
    mockFeedResponses({});
    renderWithStore(<Motion />);

    expect(await screen.findByRole('heading', { name: 'Nothing is trending yet' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Choose categories' })).toHaveAttribute('href', '/settings');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryAllByRole('article')).toHaveLength(0);
  });

  it('error: a failing source shows an alert with retry for that tab only; retry recovers', async () => {
    mockFeedResponses({ news: 500, movies: pageOf(2, 'movie') });
    const user = userEvent.setup();
    renderWithStore(<Motion />);

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText("We couldn't load trending")).toBeInTheDocument();
    expect(screen.queryAllByRole('article')).toHaveLength(0);

    // The other tabs are unaffected.
    await user.click(screen.getByRole('tab', { name: 'Movies' }));
    expect(await screen.findByText('Title movie-0')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
    await user.click(screen.getByRole('tab', { name: 'News' }));
    const again = await screen.findByRole('alert');

    mockFeedResponses({ news: pageOf(2, 'news'), movies: pageOf(2, 'movie') });
    await user.click(within(again).getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Title news-0')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('Trending page: i18n', () => {
  it('renders in Spanish', async () => {
    mockFeedResponses({ news: pageOf(1, 'news') });
    const { store } = renderWithStore(<Motion />);
    act(() => {
      store.dispatch(setLanguage('es'));
    });

    expect(await screen.findByRole('tablist', { name: 'Tendencias por tipo' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Películas' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Tendencias' })).toBeInTheDocument();
  });
});
