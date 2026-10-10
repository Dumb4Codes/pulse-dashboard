import userEvent from '@testing-library/user-event';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Inbox } from 'lucide-react';
import { CardImage } from '@/components/CardImage';
import { CategoryChips } from '@/components/CategoryChips';
import { ContentCard } from '@/components/ContentCard';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { FavoriteButton } from '@/components/FavoriteButton';
import { CardSkeleton } from '@/components/Skeleton';
import { CATEGORIES } from '@/lib/categories';
import { formatRelativeTime } from '@/lib/relativeTime';
import type { ContentItem, ContentType } from '@/lib/types';
import { setLanguage } from '@/store/slices/preferences';
import { renderWithStore } from '../helpers';

const HOUR = 3_600_000;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

const item = (over: Partial<ContentItem> = {}): ContentItem => ({
  id: 'news-technology-0-0',
  type: 'news',
  category: 'technology',
  title: 'Open-source model matches proprietary rivals',
  description: 'A community-trained model landed within two points of the leading closed systems.',
  image: 'https://picsum.photos/seed/news-technology-0-0/800/520',
  url: 'https://example.com/news-technology-0-0',
  source: 'Meridian Wire',
  publishedAt: ago(3 * HOUR),
  score: 10,
  ...over,
});

const imgOf = (container: HTMLElement) => container.querySelector('img');

describe('ContentCard', () => {
  it('is an article labelled by its headline and shows title, description, source, relative date and category', () => {
    renderWithStore(<ContentCard item={item()} />);

    const card = screen.getByRole('article', { name: 'Open-source model matches proprietary rivals' });
    expect(card).toBeInTheDocument();
    expect(within(card).getByRole('heading', { name: 'Open-source model matches proprietary rivals' })).toBeInTheDocument();
    expect(within(card).getByText(/community-trained model/)).toBeInTheDocument();
    expect(within(card).getByText('Meridian Wire')).toBeInTheDocument();
    expect(within(card).getByText('3 hours ago')).toBeInTheDocument();
    expect(within(card).getByText('Technology')).toBeInTheDocument();
  });

  it('exposes the publication instant machine-readably through <time dateTime>', () => {
    const publishedAt = ago(2 * HOUR);
    const { container } = renderWithStore(<ContentCard item={item({ publishedAt })} />);
    expect(container.querySelector('time')).toHaveAttribute('datetime', publishedAt);
  });

  it('renders a decorative, lazy, referrer-less thumbnail', () => {
    const { container } = renderWithStore(<ContentCard item={item()} />);
    const img = imgOf(container);
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute('alt', '');
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('referrerpolicy', 'no-referrer');
    expect(img).toHaveAttribute('src', 'https://picsum.photos/seed/news-technology-0-0/800/520');
  });

  it.each<[ContentType, string, string]>([
    ['news', 'Read more', 'News'],
    ['movie', 'Play now', 'Movie'],
    ['social', 'View post', 'Post'],
  ])('%s: CTA "%s" is a new-tab link and the badge reads "%s"', (type, cta, badge) => {
    renderWithStore(<ContentCard item={item({ type, url: 'https://example.com/go' })} />);
    const link = screen.getByRole('link', { name: cta });
    expect(link).toHaveAttribute('href', 'https://example.com/go');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    // The destination is announced on the link as a description (headline + "opens in a new tab"), not in its name.
    expect(link).toHaveAccessibleDescription(/Open-source model.*Opens in a new tab/);
    expect(within(screen.getByRole('article')).getByText(badge)).toBeInTheDocument();
  });

  it('refuses to link out to a non-http(s) url (javascript:, data:); only the details link remains', () => {
    renderWithStore(<ContentCard item={item({ url: 'javascript:alert(1)' })} />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', '/content/news-technology-0-0');
    expect(links[0]).not.toHaveAttribute('target');
    expect(screen.getByRole('article')).toBeInTheDocument();
  });

  it('the headline is the link to the details page, and the card has no other way in', () => {
    renderWithStore(<ContentCard item={item({ id: 'news-a/b c' })} />);
    const heading = screen.getByRole('heading', { name: 'Open-source model matches proprietary rivals' });
    const link = within(heading).getByRole('link', { name: 'Open-source model matches proprietary rivals' });
    // The id is an opaque API string, so it is always encoded.
    expect(link).toHaveAttribute('href', '/content/news-a%2Fb%20c');
    expect(link).not.toHaveAttribute('target');
    // The two other links/buttons are separate targets raised above the stretched link.
    expect(screen.getByRole('link', { name: 'Read more' })).toHaveClass('z-10');
    expect(screen.getByRole('button', { name: 'Add to favorites' })).toHaveClass('z-10');
  });

  it('renders markup in the title and description as inert text', () => {
    const title = '<img src=x onerror=alert(1)>';
    const description = '<script>alert(2)</script> <b>bold?</b>';
    const { container } = renderWithStore(<ContentCard item={item({ title, description })} />);

    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    expect(screen.getByText(description)).toBeInTheDocument();
    // Only the card's own thumbnail exists: no injected <img src="x">, <script> or <b>.
    expect(container.querySelectorAll('img')).toHaveLength(1);
    expect(container.querySelector('img[src="x"]')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
  });

  it('handles an extreme headline without breaking the article', () => {
    const title = 'W'.repeat(400);
    renderWithStore(<ContentCard item={item({ title, description: '' })} />);
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
  });

  it('shows a drag handle only when draggable', () => {
    const { rerender } = renderWithStore(<ContentCard item={item()} />);
    expect(screen.queryByLabelText('Drag to reorder')).not.toBeInTheDocument();

    rerender(<ContentCard item={item()} draggable />);
    expect(screen.getByLabelText('Drag to reorder')).toBeInTheDocument();
  });

  it('renders an injected handle in the handle slot instead of the built-in grip', () => {
    renderWithStore(
      <ContentCard
        item={item()}
        draggable
        handle={
          <button type="button" aria-label="Drag to reorder" data-injected>
            grip
          </button>
        }
      />,
    );
    const handles = screen.getAllByLabelText('Drag to reorder');
    expect(handles).toHaveLength(1);
    expect(handles[0]).toHaveAttribute('data-injected');
    expect(within(screen.getByRole('article')).getByRole('button', { name: 'Drag to reorder' })).toBe(handles[0]);
  });

  it('is memoised so unrelated re-renders of a long feed are cheap', () => {
    expect((ContentCard as unknown as { $$typeof: symbol }).$$typeof).toBe(Symbol.for('react.memo'));
  });

  it('translates the CTA, badge, category and relative date with the active language', async () => {
    const { store } = renderWithStore(<ContentCard item={item({ type: 'movie', category: 'entertainment' })} />);
    act(() => {
      store.dispatch(setLanguage('es'));
    });
    expect(await screen.findByRole('link', { name: 'Reproducir' })).toBeInTheDocument();
    expect(screen.getByText('Película')).toBeInTheDocument();
    expect(screen.getByText('Entretenimiento')).toBeInTheDocument();
    expect(screen.getByText('hace 3 horas')).toBeInTheDocument();
  });

  it('embeds a working favourite toggle', async () => {
    const user = userEvent.setup();
    const { store } = renderWithStore(<ContentCard item={item()} />);
    await user.click(within(screen.getByRole('article')).getByRole('button', { name: /favorites/i }));
    expect(store.getState().favorites.byId).toHaveProperty('news-technology-0-0');
  });
});

describe('CardImage', () => {
  it('swaps a failed image for the gradient fallback (no broken-image icon)', () => {
    const { container } = renderWithStore(<CardImage src="https://img.example/broken.jpg" type="news" />);
    expect(container.querySelector('[data-image-state]')).toHaveAttribute('data-image-state', 'image');

    fireEvent.error(imgOf(container)!);

    expect(imgOf(container)).toBeNull();
    expect(container.querySelector('[data-image-state]')).toHaveAttribute('data-image-state', 'fallback');
  });

  it.each(['', '   ', 'javascript:alert(1)', 'not a url'])('uses the fallback straight away for src %j', (src) => {
    const { container } = renderWithStore(<CardImage src={src} type="movie" />);
    expect(imgOf(container)).toBeNull();
    expect(container.querySelector('[data-image-state]')).toHaveAttribute('data-image-state', 'fallback');
  });

  it('recovers when handed a new, working src after a failure', () => {
    const { container, rerender } = renderWithStore(<CardImage src="https://img.example/a.jpg" type="social" />);
    fireEvent.error(imgOf(container)!);
    expect(imgOf(container)).toBeNull();

    rerender(<CardImage src="https://img.example/b.jpg" type="social" />);
    expect(imgOf(container)).toHaveAttribute('src', 'https://img.example/b.jpg');
  });

  it('keeps the fallback inside a card whose image fails', () => {
    const { container } = renderWithStore(<ContentCard item={item()} />);
    fireEvent.error(imgOf(container)!);
    expect(imgOf(container)).toBeNull();
    expect(container.querySelector('[data-image-state="fallback"]')).not.toBeNull();
    expect(screen.getByRole('article')).toBeInTheDocument();
  });
});

describe('FavoriteButton', () => {
  it('flips aria-pressed and adds / removes the item snapshot in the store', async () => {
    const user = userEvent.setup();
    const it = item();
    const { store } = renderWithStore(<FavoriteButton item={it} />);

    const button = screen.getByRole('button', { name: 'Add to favorites' });
    expect(button).toHaveAttribute('aria-pressed', 'false');

    await user.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveAccessibleName('Remove from favorites');
    expect(store.getState().favorites.byId[it.id]).toEqual(it);

    await user.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(store.getState().favorites.byId).toEqual({});
  });

  it('starts pressed for an already favourited item and works from the keyboard', async () => {
    const user = userEvent.setup();
    const it = item();
    const { store } = renderWithStore(<FavoriteButton item={it} />, {
      preloaded: { favorites: { byId: { [it.id]: it } } },
    });
    const button = screen.getByRole('button', { name: 'Remove from favorites' });
    expect(button).toHaveAttribute('aria-pressed', 'true');

    button.focus();
    await user.keyboard('{Enter}');
    expect(button).toHaveAttribute('aria-pressed', 'false');
    await user.keyboard(' ');
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(store.getState().favorites.byId).toHaveProperty(it.id);
  });
});

describe('CardSkeleton', () => {
  it('renders one placeholder by default and exactly `count` when asked, announced once as loading', () => {
    const { container, rerender } = renderWithStore(<CardSkeleton />);
    expect(container.querySelectorAll('[data-skeleton-card]')).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent('Loading content…');

    rerender(<CardSkeleton count={4} />);
    expect(container.querySelectorAll('[data-skeleton-card]')).toHaveLength(4);
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });

  it('hides the shimmering blocks from assistive tech', () => {
    const { container } = renderWithStore(<CardSkeleton count={2} />);
    const blocks = container.querySelectorAll('.skeleton');
    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) expect(block.closest('[aria-hidden="true"]')).not.toBeNull();
  });
});

describe('EmptyState', () => {
  it('renders the icon, title, body and the action it is given', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderWithStore(
      <EmptyState
        icon={Inbox}
        title="No favorites yet"
        body="Tap the heart on any card to keep it here."
        action={<button onClick={onClick}>Browse the feed</button>}
      />,
    );
    expect(screen.getByRole('heading', { name: 'No favorites yet' })).toBeInTheDocument();
    expect(screen.getByText('Tap the heart on any card to keep it here.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Browse the feed' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('works without a body or an action, and accepts an icon element as well as an icon component', () => {
    const { container } = renderWithStore(<EmptyState icon={<svg data-custom-icon />} title="Nothing here yet" />);
    expect(screen.getByRole('heading', { name: 'Nothing here yet' })).toBeInTheDocument();
    expect(container.querySelector('[data-custom-icon]')).not.toBeNull();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('ErrorState', () => {
  it('is an alert with the translated default copy and calls onRetry on click', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    renderWithStore(<ErrorState onRetry={onRetry} />);

    const alert = screen.getByRole('alert');
    expect(within(alert).getByRole('heading', { name: "We couldn't load your feed" })).toBeInTheDocument();
    await user.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('accepts custom copy', () => {
    renderWithStore(<ErrorState onRetry={() => {}} title="Search failed" body="The index is down." />);
    expect(screen.getByRole('alert')).toHaveTextContent('Search failed');
    expect(screen.getByRole('alert')).toHaveTextContent('The index is down.');
  });

  it('locks the button while an async retry is in flight so it cannot be double-fired', async () => {
    const user = userEvent.setup();
    let finish: () => void = () => {};
    const onRetry = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    renderWithStore(<ErrorState onRetry={onRetry} />);

    const button = screen.getByRole('button', { name: 'Try again' });
    await user.click(button);
    // aria-disabled (not `disabled`) so a keyboard user keeps focus on the button while it works.
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAttribute('aria-busy', 'true');
    await user.click(button);
    expect(onRetry).toHaveBeenCalledTimes(1);

    await act(async () => finish());
    await waitFor(() => expect(button).not.toHaveAttribute('aria-disabled'));
    expect(button).not.toHaveAttribute('aria-busy');
  });

  it('keeps keyboard focus on the retry button while it is pending', async () => {
    const user = userEvent.setup();
    let finish: () => void = () => {};
    renderWithStore(<ErrorState onRetry={() => new Promise<void>((resolve) => { finish = resolve; })} />);

    const button = screen.getByRole('button', { name: 'Try again' });
    button.focus();
    await user.keyboard('{Enter}');
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveFocus();

    await act(async () => finish());
  });

  it('survives a retry that rejects (button comes back, nothing throws)', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn().mockRejectedValue(new Error('still down'));
    renderWithStore(<ErrorState onRetry={onRetry} />);
    const button = screen.getByRole('button', { name: 'Try again' });
    await user.click(button);
    await waitFor(() => expect(button).not.toHaveAttribute('aria-disabled'));
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});

describe('CategoryChips', () => {
  it('is a labelled group with one toggle button per category reflecting the selection', () => {
    renderWithStore(<CategoryChips selected={['technology', 'finance']} onToggle={() => {}} />);

    const group = screen.getByRole('group', { name: 'Categories' });
    const buttons = within(group).getAllByRole('button');
    expect(buttons).toHaveLength(CATEGORIES.length);
    expect(within(group).getByRole('button', { name: 'Technology' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(group).getByRole('button', { name: 'Finance' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(group).getByRole('button', { name: 'Sports' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onToggle with the category on click and on keyboard activation', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    renderWithStore(<CategoryChips selected={['technology', 'finance']} onToggle={onToggle} />);

    await user.click(screen.getByRole('button', { name: 'Sports' }));
    expect(onToggle).toHaveBeenLastCalledWith('sports');

    screen.getByRole('button', { name: 'Health' }).focus();
    await user.keyboard('{Enter}');
    expect(onToggle).toHaveBeenLastCalledWith('health');
    expect(onToggle).toHaveBeenCalledTimes(2);
  });

  it('will not offer to remove the only selected category', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const onBlocked = vi.fn();
    renderWithStore(<CategoryChips selected={['science']} onToggle={onToggle} onBlocked={onBlocked} />);

    const last = screen.getByRole('button', { name: 'Science' });
    expect(last).toHaveAttribute('aria-pressed', 'true');
    expect(last).toHaveAttribute('aria-disabled', 'true');
    expect(last).toHaveAccessibleDescription('Keep at least one category selected.');
    await user.click(last);
    expect(onToggle).not.toHaveBeenCalled();
    // The page is told, so it can explain (an aria-live hint) instead of failing silently.
    expect(onBlocked).toHaveBeenCalledExactlyOnceWith('science');

    // Adding another category is still fine, and the old one is then removable again.
    await user.click(screen.getByRole('button', { name: 'Health' }));
    expect(onToggle).toHaveBeenCalledWith('health');
  });
});

describe('formatRelativeTime', () => {
  const now = Date.UTC(2026, 9, 8, 12, 0, 0);
  const at = (ms: number) => new Date(now - ms).toISOString();
  const fmt = (iso: string, locale = 'en') => formatRelativeTime(iso, locale, now);

  it('picks the largest sensible unit', () => {
    expect(fmt(at(5_000))).toBe('now');
    expect(fmt(at(5 * 60_000))).toBe('5 minutes ago');
    expect(fmt(at(3 * HOUR))).toBe('3 hours ago');
    expect(fmt(at(24 * HOUR))).toBe('yesterday');
    expect(fmt(at(10 * 24 * HOUR))).toBe('last week');
    expect(fmt(at(100 * 24 * HOUR))).toBe('3 months ago');
    expect(fmt(at(800 * 24 * HOUR))).toBe('2 years ago');
  });

  it('localises through Intl', () => {
    expect(fmt(at(3 * HOUR), 'es')).toBe('hace 3 horas');
    expect(fmt(at(2 * HOUR), 'hi')).toMatch(/\p{Script=Devanagari}/u);
  });

  it('treats a slightly-future timestamp (clock skew) as now, but keeps genuine future dates', () => {
    expect(fmt(new Date(now + 10 * 60_000).toISOString())).toBe('now');
    expect(fmt(new Date(now + 3 * 24 * HOUR).toISOString())).toBe('in 3 days');
  });

  it('returns an empty string for unusable input instead of throwing', () => {
    expect(fmt('not a date')).toBe('');
    expect(fmt('')).toBe('');
    expect(fmt(new Date(0).toISOString())).toBe(''); // the movies provider's "no release date" sentinel
    expect(formatRelativeTime(at(HOUR), 'xx-not_a_locale', now)).toBe('1 hour ago');
  });
});
