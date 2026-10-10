import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import ContentPage from '@/app/(dashboard)/content/[id]/page';
import { formatDate } from '@/lib/formatDate';
import type { ContentItem } from '@/lib/types';
import { setLanguage, DEFAULT_PREFERENCES } from '@/store/slices/preferences';
import { renderWithStore } from '../helpers';
import { makeItem, mockFeedResponses, pageOf, server } from '../msw';

const push = vi.hoisted(() => vi.fn());
const back = vi.hoisted(() => vi.fn());
const params = vi.hoisted(() => ({ id: 'news-1' }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/content/x',
  useParams: () => params,
  useRouter: () => ({ push, back, replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
  push.mockClear();
  back.mockClear();
});
afterAll(() => server.close());

const openStory = (over: Partial<ContentItem> = {}) => {
  const item = makeItem('news-1', { score: 72, ...over });
  params.id = item.id;
  return item;
};

/** Renders the page with `item` already remembered, like arriving from a card. Related requests answer empty unless asked. */
function renderFor(item: ContentItem, preferences = DEFAULT_PREFERENCES) {
  mockFeedResponses({});
  return renderWithStore(<ContentPage />, {
    preloaded: { recent: { items: [item] }, preferences },
  });
}

describe('Details page: the item', () => {
  it('shows the headline as the page\'s one h1, with description, source, category and a dated facts panel', async () => {
    const item = openStory();
    renderFor(item);

    const article = await screen.findByRole('article', { name: 'Title news-1' });
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(within(article).getByRole('heading', { level: 1, name: 'Title news-1' })).toBeInTheDocument();
    expect(within(article).getByText('Description of news-1')).toBeInTheDocument();
    expect(within(article).getByText('Technology')).toBeInTheDocument();
    expect(within(article).getByText('News')).toBeInTheDocument();

    const glance = within(article).getByRole('complementary', { name: 'At a glance' });
    const facts = within(glance);
    expect(facts.getByText('Test Wire')).toBeInTheDocument();
    expect(facts.getByText(formatDate(item.publishedAt, 'en'))).toBeInTheDocument();
    expect(facts.getByText('example.com')).toBeInTheDocument();
  });

  it('has a new-tab call to action that matches the type, and a time element with the machine date', async () => {
    const item = openStory({ type: 'movie', url: 'https://example.com/film' });
    const { container } = renderFor(item);
    const cta = await screen.findByRole('link', { name: 'Play now' });
    expect(cta).toHaveAttribute('href', 'https://example.com/film');
    expect(cta).toHaveAttribute('target', '_blank');
    expect(cta).toHaveAttribute('rel', 'noopener noreferrer');
    expect(cta).toHaveAccessibleDescription('Opens in a new tab');
    expect(container.querySelector('time')).toHaveAttribute('datetime', item.publishedAt);
  });

  it('never links out to a non-http(s) url, and omits the link fact', async () => {
    renderFor(openStory({ url: 'javascript:alert(1)' }));
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('link', { name: 'Read more' })).toBeNull();
    expect(document.querySelector('a[href^="javascript:"]')).toBeNull();
    expect(screen.queryByText('Original link')).toBeNull();
  });

  it('shows the score as an accessible meter', async () => {
    renderFor(openStory({ score: 72 }));
    const meter = await screen.findByRole('meter', { name: 'Trending score' });
    expect(meter).toHaveAttribute('aria-valuenow', '72');
    expect(meter).toHaveAttribute('aria-valuetext', '72 out of 100');
  });

  it('clamps an out-of-range score', async () => {
    renderFor(openStory({ score: 250 }));
    expect(await screen.findByRole('meter')).toHaveAttribute('aria-valuenow', '100');
  });

  it('omits the date and author rows the item does not have (movies have no release timestamp)', async () => {
    renderFor(openStory({ type: 'movie', publishedAt: new Date(0).toISOString() }));
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByText('Published')).toBeNull();
    expect(screen.queryByText('Author')).toBeNull();
    expect(document.querySelector('time')).toBeNull();
  });

  it('shows a post as a quotation under its author, with the handle', async () => {
    renderFor(
      openStory({ id: 'post-1', type: 'social', title: '@maya', author: 'Maya Chen', description: 'Shipping #ai today' }),
    );
    const heading = await screen.findByRole('heading', { level: 1, name: 'Maya Chen' });
    expect(heading).toBeInTheDocument();
    expect(screen.getByText('@maya')).toBeInTheDocument();
    expect(document.querySelector('blockquote')).toHaveTextContent('Shipping #ai today');
    expect(screen.getByText('Author').closest('div')).toHaveTextContent('Maya Chen');
    expect(screen.getByRole('link', { name: 'View post' })).toBeInTheDocument();
  });

  it('renders markup in the title and description as inert text', async () => {
    const title = '<img src=x onerror=alert(1)>';
    renderFor(openStory({ title, description: '<script>alert(2)</script>' }));
    const heading = await screen.findByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent(title);
    expect(document.querySelector('main script, article script')).toBeNull();
    expect(document.querySelector('article img[onerror]')).toBeNull();
  });

  it('sets the document title to the headline', async () => {
    renderFor(openStory());
    await screen.findByRole('heading', { level: 1 });
    await waitFor(() => expect(document.title).toBe('Title news-1 — Pulse'));
  });
});

describe('Details page: why it is shown', () => {
  it('names the followed category', async () => {
    renderFor(openStory({ category: 'sports' }), { ...DEFAULT_PREFERENCES, categories: ['sports'] });
    expect(await screen.findByText(/You follow Sports, so Pulse picked this/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open settings' })).toBeNull();
  });

  it('names the followed hashtag a post mentions', async () => {
    renderFor(openStory({ id: 'post-1', type: 'social', description: 'Loving #AI lately' }), {
      ...DEFAULT_PREFERENCES,
      hashtags: ['ai'],
    });
    expect(await screen.findByText(/It mentions #ai, one of your hashtags/)).toBeInTheDocument();
  });

  it('when the category is not followed, says so and links to Settings', async () => {
    renderFor(openStory({ category: 'health' }), { ...DEFAULT_PREFERENCES, categories: ['sports'] });
    expect(await screen.findByText(/Health isn't one of your categories/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open settings' })).toHaveAttribute('href', '/settings');
  });
});

describe('Details page: actions', () => {
  it('the heart saves and removes a favorite, and the page keeps showing the item', async () => {
    const item = openStory();
    const { store } = renderFor(item);
    const article = await screen.findByRole('article', { name: 'Title news-1' });

    fireEvent.click(within(article).getByRole('button', { name: 'Add to favorites' }));
    expect(store.getState().favorites.byId['news-1']?.title).toBe('Title news-1');
    fireEvent.click(within(article).getByRole('button', { name: 'Remove from favorites' }));
    expect(store.getState().favorites.byId['news-1']).toBeUndefined();
    expect(within(article).getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('copies the page address and confirms it, to the eye and to a screen reader', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    renderFor(openStory());

    fireEvent.click(await screen.findByRole('button', { name: 'Copy link' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Link copied' })).toBeInTheDocument());
    expect(writeText).toHaveBeenCalledWith(window.location.href);
    expect(screen.getByRole('status')).toHaveTextContent('Link copied');
  });

  it('says so when the clipboard is blocked', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    renderFor(openStory());

    fireEvent.click(await screen.findByRole('button', { name: 'Copy link' }));
    await waitFor(() => expect(screen.getByRole('button', { name: "Couldn't copy the link" })).toBeInTheDocument());
    expect(screen.getByRole('status')).toHaveTextContent("Couldn't copy the link");
  });

  it('Back returns to the previous page when there is one', async () => {
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(4);
    renderFor(openStory());
    fireEvent.click(await screen.findByRole('button', { name: 'Back' }));
    expect(back).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });

  it('Back goes to the feed when the page was opened directly (nothing to go back to)', async () => {
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(1);
    renderFor(openStory());
    fireEvent.click(await screen.findByRole('button', { name: 'Back' }));
    expect(push).toHaveBeenCalledWith('/');
    expect(back).not.toHaveBeenCalled();
  });
});

describe('Details page: related items', () => {
  it('lists up to three other items from the same category, mixed across types, each opening its own page', async () => {
    const item = openStory();
    mockFeedResponses({ news: pageOf(4, 'news'), movies: pageOf(2, 'movie'), social: pageOf(2, 'post') });
    renderWithStore(<ContentPage />, { preloaded: { recent: { items: [item] } } });

    const related = await screen.findByRole('region', { name: 'More in Technology' });
    const cards = await within(related).findAllByRole('article');
    expect(cards).toHaveLength(3);
    expect(within(related).queryByText('Title news-1')).toBeNull(); // never itself
    expect(within(related).getByRole('link', { name: 'Title news-0' })).toHaveAttribute('href', '/content/news-0');
    expect(within(related).getByRole('link', { name: 'Title movie-0' })).toHaveAttribute('href', '/content/movie-0');
  });

  it('is left out when there is nothing else to show', async () => {
    renderFor(openStory());
    await screen.findByRole('heading', { level: 1 });
    await waitFor(() => expect(screen.queryByRole('region', { name: /More in/ })).toBeNull());
  });
});

describe('Details page: finding the item', () => {
  it('shows a loading skeleton, then fetches an item that is not in memory and remembers it', async () => {
    params.id = 'news-technology-0-0';
    const fetched = makeItem('news-technology-0-0', { title: 'Fetched from the server' });
    mockFeedResponses({});
    server.use(
      http.get('*/api/item', async ({ request }) => {
        expect(new URL(request.url).searchParams.get('id')).toBe('news-technology-0-0');
        await delay(30);
        return HttpResponse.json(fetched);
      }),
    );
    const { store } = renderWithStore(<ContentPage />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading content…');
    expect(await screen.findByRole('heading', { level: 1, name: 'Fetched from the server' })).toBeInTheDocument();
    expect(screen.queryByText("We couldn't find that item")).toBeNull();
    await waitFor(() => expect(store.getState().recent.items[0]?.id).toBe('news-technology-0-0'));
  });

  it('does not ask the server for an item it already has', async () => {
    const asked = vi.fn();
    server.use(http.get('*/api/item', () => (asked(), HttpResponse.json({}, { status: 500 }))));
    renderFor(openStory());
    await screen.findByRole('heading', { level: 1, name: 'Title news-1' });
    expect(asked).not.toHaveBeenCalled();
  });

  it('finds an item in favorites too, even when it is not in recent', async () => {
    const item = openStory({ title: 'A saved favorite' });
    mockFeedResponses({});
    renderWithStore(<ContentPage />, { preloaded: { favorites: { byId: { [item.id]: item } } } });
    expect(await screen.findByRole('heading', { level: 1, name: 'A saved favorite' })).toBeInTheDocument();
  });

  it('says it could not find an item the server does not know, and offers the way back', async () => {
    params.id = 'news-AbC_123';
    mockFeedResponses({});
    server.use(http.get('*/api/item', () => HttpResponse.json({ error: 'not found' }, { status: 404 })));
    renderWithStore(<ContentPage />);

    expect(await screen.findByRole('heading', { level: 2, name: "We couldn't find that item" })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to your feed' })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
  });

  it('moves to the next item when the id changes (a related card was opened)', async () => {
    const first = openStory();
    const second = makeItem('news-2', { title: 'The second story' });
    mockFeedResponses({});
    const { store, rerender } = renderWithStore(<ContentPage />, { preloaded: { recent: { items: [first, second] } } });
    await screen.findByRole('heading', { level: 1, name: 'Title news-1' });

    params.id = 'news-2';
    await act(async () => rerender(<ContentPage />));
    expect(await screen.findByRole('heading', { level: 1, name: 'The second story' })).toBeInTheDocument();
    await waitFor(() => expect(store.getState().recent.items[0].id).toBe('news-2'));
  });
});

describe('Details page: language', () => {
  it('follows the interface language, including the facts panel', async () => {
    const item = openStory();
    const { store } = renderFor(item);
    await screen.findByRole('heading', { level: 1 });

    await act(async () => {
      store.dispatch(setLanguage('es'));
    });
    expect(await screen.findByRole('button', { name: 'Volver' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'De un vistazo' })).toBeInTheDocument();
    expect(screen.getByRole('meter', { name: 'Puntuación de tendencia' })).toHaveAttribute('aria-valuetext', '72 de 100');
    expect(screen.getByRole('button', { name: 'Copiar enlace' })).toBeInTheDocument();
  });
});
