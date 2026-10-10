import type { ReactNode } from 'react';
import userEvent from '@testing-library/user-event';
import { act, screen, waitFor, within } from '@testing-library/react';
import { LazyMotion, domMax } from 'framer-motion';
import FavoritesPage from '@/app/(dashboard)/favorites/page';
import FeedPage from '@/app/(dashboard)/page';
import type { ContentItem } from '@/lib/types';
import { toggleFavorite } from '@/store/slices/favorites';
import { setLanguage } from '@/store/slices/preferences';
import { renderWithStore } from '../helpers';
import { makeItem, mockFeedResponses, pageOf, server } from '../msw';

/** The dashboard layout provides LazyMotion (ShellMotion); layout/presence animations need its features. */
function Motion({ children }: { children: ReactNode }) {
  return <LazyMotion features={domMax}>{children}</LazyMotion>;
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const articleTitles = () =>
  screen
    .queryAllByRole('article')
    .map((a) => document.getElementById(a.getAttribute('aria-labelledby') ?? '')?.textContent);

/** Saved in this order, so the page should show them newest first. */
function favoritesStore(items: ContentItem[]) {
  const view = renderWithStore(
    <Motion>
      <FavoritesPage />
    </Motion>,
  );
  act(() => {
    for (const item of items) view.store.dispatch(toggleFavorite(item));
  });
  return view;
}

describe('Favorites page', () => {
  it('first-run empty state: explains itself and links back to the feed', () => {
    renderWithStore(
      <Motion>
        <FavoritesPage />
      </Motion>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Favorites' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'No favorites yet' })).toBeInTheDocument();
    expect(screen.getByText('Tap the heart on any card to keep it here.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse your feed' })).toHaveAttribute('href', '/');
    // Nothing to filter yet.
    expect(screen.queryByRole('radiogroup')).toBeNull();
    expect(screen.queryAllByRole('article')).toHaveLength(0);
  });

  it('lists an item favorited in the feed (feed and favorites share one store)', async () => {
    mockFeedResponses({ news: pageOf(2, 'news'), movies: pageOf(1, 'movie') });
    const user = userEvent.setup();
    const feed = renderWithStore(
      <Motion>
        <FeedPage />
      </Motion>,
    );
    await within(feed.container).findByText('Title news-0');

    const favorites = renderWithStore(
      <Motion>
        <FavoritesPage />
      </Motion>,
      { store: feed.store },
    );
    expect(within(favorites.container).getByText('No favorites yet')).toBeInTheDocument();

    await user.click(within(feed.container).getAllByRole('button', { name: 'Add to favorites' })[0]);

    expect(await within(favorites.container).findByRole('article', { name: 'Title news-0' })).toBeInTheDocument();
    expect(within(favorites.container).queryByText('No favorites yet')).toBeNull();
    expect(within(favorites.container).getByText('1 saved item')).toBeInTheDocument();
  });

  it('unfavoriting removes the card, updates the count and falls back to the empty state', async () => {
    const user = userEvent.setup();
    favoritesStore([makeItem('a'), makeItem('b')]);

    expect(screen.getByText('2 saved items')).toBeInTheDocument();
    await user.click(within(screen.getByRole('article', { name: 'Title a' })).getByRole('button', { name: 'Remove from favorites' }));

    await waitFor(() => expect(screen.queryByRole('article', { name: 'Title a' })).toBeNull());
    expect(screen.getByRole('article', { name: 'Title b' })).toBeInTheDocument();
    expect(screen.getByText('1 saved item')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove from favorites' }));
    expect(await screen.findByText('No favorites yet')).toBeInTheDocument();
  });

  it('keeps keyboard focus in the list when a card is removed (it must not drop to <body>)', async () => {
    const user = userEvent.setup();
    favoritesStore([makeItem('a'), makeItem('b'), makeItem('c')]); // shown newest first: c, b, a
    const heart = (title: string) =>
      within(screen.getByRole('article', { name: title })).getByRole('button', { name: 'Remove from favorites' });

    heart('Title b').focus();
    await user.keyboard('{Enter}');

    await waitFor(() => expect(screen.queryByRole('article', { name: 'Title b' })).toBeNull());
    // "Title a" slid up into the row that "Title b" left; its heart now holds focus.
    await waitFor(() => expect(heart('Title a')).toHaveFocus());
  });

  it('removing the last card hands focus to the empty state action', async () => {
    const user = userEvent.setup();
    favoritesStore([makeItem('a')]);

    screen.getByRole('button', { name: 'Remove from favorites' }).focus();
    await user.keyboard('{Enter}');

    expect(await screen.findByText('No favorites yet')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('link', { name: 'Browse your feed' })).toHaveFocus());
  });

  it('shows the most recently saved first', () => {
    favoritesStore([makeItem('a'), makeItem('b'), makeItem('c')]);
    expect(articleTitles()).toEqual(['Title c', 'Title b', 'Title a']);
  });

  it('a favorite that the API no longer returns still renders from its saved snapshot', async () => {
    // The feed serves entirely different items; "gone" is only in the store.
    mockFeedResponses({ news: pageOf(1, 'news') });
    const gone = makeItem('gone-story', { title: 'A story that left the API', description: 'Saved snapshot text' });
    const feed = renderWithStore(
      <Motion>
        <FeedPage />
      </Motion>,
      { preloaded: { favorites: { byId: { [gone.id]: gone } } } },
    );
    await within(feed.container).findByText('Title news-0');
    expect(within(feed.container).queryByText('A story that left the API')).toBeNull();

    const favorites = renderWithStore(
      <Motion>
        <FavoritesPage />
      </Motion>,
      { store: feed.store },
    );
    const card = within(favorites.container).getByRole('article', { name: 'A story that left the API' });
    expect(within(card).getByText('Saved snapshot text')).toBeInTheDocument();
  });

  it('filters by content type with counts, and offers a way back when a filter has nothing', async () => {
    const user = userEvent.setup();
    favoritesStore([
      makeItem('n1'),
      makeItem('m1', { type: 'movie' }),
      makeItem('m2', { type: 'movie' }),
      makeItem('p1', { type: 'social' }),
    ]);

    const group = screen.getByRole('radiogroup', { name: 'Filter by type' });
    const radios = within(group).getAllByRole('radio');
    expect(radios.map((r) => r.closest('label')?.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'All 4',
      'News 1',
      'Movies 2',
      'Posts 1',
    ]);
    expect(within(group).getByRole('radio', { name: /^All/ })).toBeChecked();

    await user.click(within(group).getByRole('radio', { name: /^Movies/ }));
    await waitFor(() => expect(articleTitles()).toEqual(['Title m2', 'Title m1']));
    expect(within(group).getByRole('radio', { name: /^Movies/ })).toBeChecked();

    // Unfavoriting the last post while viewing Posts leaves that filter empty.
    await user.click(within(group).getByRole('radio', { name: /^Posts/ }));
    await waitFor(() => expect(articleTitles()).toEqual(['Title p1']));
    await user.click(screen.getByRole('button', { name: 'Remove from favorites' }));

    expect(await screen.findByText('Nothing saved here')).toBeInTheDocument();
    expect(screen.queryByText('No favorites yet')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Show all' }));
    await waitFor(() => expect(articleTitles()).toEqual(['Title m2', 'Title m1', 'Title n1']));
  });

  it('keeps the filter pills reachable with the keyboard (native radios: arrows move and select)', async () => {
    const user = userEvent.setup();
    favoritesStore([makeItem('n1'), makeItem('m1', { type: 'movie' })]);

    const group = screen.getByRole('radiogroup', { name: 'Filter by type' });
    within(group).getByRole('radio', { name: /^All/ }).focus();
    await user.keyboard('{ArrowRight}');

    expect(within(group).getByRole('radio', { name: /^News/ })).toBeChecked();
    await waitFor(() => expect(articleTitles()).toEqual(['Title n1']));
  });

  it('is translated: Spanish title, count (plural) and filter labels', async () => {
    const view = favoritesStore([makeItem('a'), makeItem('b')]);
    act(() => {
      view.store.dispatch(setLanguage('es'));
    });

    expect(await screen.findByRole('heading', { level: 1, name: 'Favoritos' })).toBeInTheDocument();
    expect(screen.getByText('2 elementos guardados')).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Filtrar por tipo' })).toBeInTheDocument();
  });
});
