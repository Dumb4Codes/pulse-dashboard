import userEvent from '@testing-library/user-event';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { LazyMotion, domMax } from 'framer-motion';
import SettingsPage from '@/app/(dashboard)/settings/page';
import { ThemeSync } from '@/components/ThemeSync';
import { AVATAR_COLORS } from '@/lib/avatarColors';
import { CATEGORIES } from '@/lib/categories';
import { DEFAULT_PREFERENCES } from '@/store/slices/preferences';
import { renderWithStore } from '../helpers';

/** The dashboard layout provides LazyMotion and (via Providers) ThemeSync; the page alone needs both. */
function Page() {
  return (
    <LazyMotion features={domMax}>
      <ThemeSync />
      <SettingsPage />
    </LazyMotion>
  );
}

const KEEP_ONE = 'Keep at least one category selected.';
const BAD_TAG = 'Use 1 to 30 letters, numbers or underscores.';
const stored = () => JSON.parse(localStorage.getItem('pulse:v1') ?? '{}');

describe('Settings page: structure', () => {
  it('has one h1 and a card (h2) per section; the toast region starts empty', () => {
    renderWithStore(<Page />);

    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
    for (const name of ['Interests', 'Appearance', 'Language', 'Profile']) {
      expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument();
    }
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });
});

describe('Settings page: interests', () => {
  it('shows all seven categories; clicking one updates the store and localStorage, and toasts "Saved"', async () => {
    const user = userEvent.setup();
    const { store } = renderWithStore(<Page />);

    const group = screen.getByRole('group', { name: 'Categories' });
    expect(within(group).getAllByRole('button')).toHaveLength(CATEGORIES.length);

    await user.click(within(group).getByRole('button', { name: 'Science' }));

    expect(store.getState().preferences.categories).toContain('science');
    expect(within(group).getByRole('button', { name: 'Science' })).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(stored().preferences.categories).toContain('science'));
    expect(await screen.findByRole('status')).toHaveTextContent('Saved');
  });

  it('un-selecting a category removes it from the store and localStorage', async () => {
    const user = userEvent.setup();
    const { store } = renderWithStore(<Page />);

    await user.click(screen.getByRole('button', { name: 'Finance' }));

    expect(store.getState().preferences.categories).toEqual(['technology', 'sports']);
    await waitFor(() => expect(stored().preferences.categories).toEqual(['technology', 'sports']));
  });

  it('un-selecting the last category is a no-op and says why in a polite live region (no toast)', async () => {
    const user = userEvent.setup();
    const { store } = renderWithStore(<Page />, {
      preloaded: { preferences: { ...DEFAULT_PREFERENCES, categories: ['technology'] } },
    });
    expect(screen.queryByText(KEEP_ONE)).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Technology' }));

    const hint = await screen.findByText(KEEP_ONE);
    expect(hint.closest('[aria-live]')).toHaveAttribute('aria-live', 'polite');
    expect(store.getState().preferences.categories).toEqual(['technology']);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();

    // Picking another category makes the explanation obsolete.
    await user.click(screen.getByRole('button', { name: 'Health' }));
    expect(screen.queryByText(KEEP_ONE)).toBeNull();
  });
});

describe('Settings page: hashtags', () => {
  const withTags = (hashtags: string[]) => ({ preferences: { ...DEFAULT_PREFERENCES, hashtags } });

  it('adds a valid tag normalised ("#Tech" -> "tech"), clears the field and persists', async () => {
    const user = userEvent.setup();
    const { store } = renderWithStore(<Page />, { preloaded: withTags(['design']) });

    const input = screen.getByLabelText('Add a hashtag');
    await user.type(input, '#Tech{Enter}');

    expect(store.getState().preferences.hashtags).toEqual(['design', 'tech']);
    expect(input).toHaveValue('');
    expect(input).not.toHaveAttribute('aria-invalid', 'true');
    const list = screen.getByRole('list', { name: 'Your hashtags' });
    expect(within(list).getByText('#tech')).toBeInTheDocument();
    await waitFor(() => expect(stored().preferences.hashtags).toEqual(['design', 'tech']));
    expect(await screen.findByRole('status')).toHaveTextContent('Saved');
  });

  it('the Add button submits the same way', async () => {
    const user = userEvent.setup();
    const { store } = renderWithStore(<Page />, { preloaded: withTags([]) });

    await user.type(screen.getByLabelText('Add a hashtag'), 'ai_news');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(store.getState().preferences.hashtags).toEqual(['ai_news']);
  });

  it('rejects markup like "<b>" with an inline error wired to the field, and stores nothing', async () => {
    const user = userEvent.setup();
    const { store } = renderWithStore(<Page />, { preloaded: withTags(['design']) });

    const input = screen.getByLabelText('Add a hashtag');
    await user.type(input, '<b>{Enter}');

    const error = await screen.findByText(BAD_TAG);
    expect(error).toHaveAttribute('role', 'alert');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription(BAD_TAG);
    expect(store.getState().preferences.hashtags).toEqual(['design']);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();

    // The message clears as soon as the user starts correcting it.
    await user.clear(input);
    await user.type(input, 'b');
    expect(screen.queryByText(BAD_TAG)).toBeNull();
    expect(input).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('rejects duplicates and an eleventh tag', async () => {
    const user = userEvent.setup();
    const { store } = renderWithStore(<Page />, { preloaded: withTags(['design']) });

    const input = screen.getByLabelText('Add a hashtag');
    await user.type(input, '#DESIGN{Enter}');
    expect(await screen.findByText('#design is already on your list.')).toBeInTheDocument();
    expect(store.getState().preferences.hashtags).toEqual(['design']);

    const full = Array.from({ length: 10 }, (_, i) => `tag${i}`);
    const second = renderWithStore(<Page />, { preloaded: withTags(full) });
    const secondInput = within(second.container).getByLabelText('Add a hashtag');
    await user.type(secondInput, 'one_more{Enter}');
    expect(await within(second.container).findByText('You can follow up to 10 hashtags.')).toBeInTheDocument();
    expect(second.store.getState().preferences.hashtags).toEqual(full);
  });

  it('removes a tag with its labelled button', async () => {
    const user = userEvent.setup();
    const { store } = renderWithStore(<Page />, { preloaded: withTags(['design', 'tech']) });

    await user.click(screen.getByRole('button', { name: 'Remove #design' }));

    expect(store.getState().preferences.hashtags).toEqual(['tech']);
    await user.click(screen.getByRole('button', { name: 'Remove #tech' }));
    expect(store.getState().preferences.hashtags).toEqual([]);
    expect(screen.getByText('No hashtags yet.')).toBeInTheDocument();
  });
});

describe('Settings page: appearance', () => {
  it('theme radio group reflects the store and updates <html data-theme>, localStorage and the toast', async () => {
    const user = userEvent.setup();
    const { store } = renderWithStore(<Page />);

    const group = screen.getByRole('radiogroup', { name: 'Theme' });
    const radios = within(group).getAllByRole('radio');
    expect(radios.map((r) => r.closest('label')?.textContent?.trim())).toEqual(['Light', 'Dark', 'System']);
    expect(within(group).getByRole('radio', { name: 'System' })).toBeChecked();

    await user.click(within(group).getByRole('radio', { name: 'Dark' }));

    expect(store.getState().preferences.theme).toBe('dark');
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'));
    expect(within(group).getByRole('radio', { name: 'Dark' })).toBeChecked();
    await waitFor(() => expect(stored().preferences.theme).toBe('dark'));
    expect(await screen.findByRole('status')).toHaveTextContent('Saved');

    await user.click(within(group).getByRole('radio', { name: 'Light' }));
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('light'));
  });

  it('the arrow keys move between themes like any radio group', async () => {
    const user = userEvent.setup();
    const { store } = renderWithStore(<Page />, {
      preloaded: { preferences: { ...DEFAULT_PREFERENCES, theme: 'light' } },
    });

    screen.getByRole('radio', { name: 'Light' }).focus();
    await user.keyboard('{ArrowRight}');

    expect(store.getState().preferences.theme).toBe('dark');
    expect(screen.getByRole('radio', { name: 'Dark' })).toHaveFocus();
  });
});

describe('Settings page: language', () => {
  it('three radio cards named in their own language; choosing one switches <html lang> and the UI', async () => {
    const user = userEvent.setup();
    const { store } = renderWithStore(<Page />);

    const group = screen.getByRole('radiogroup', { name: 'Language' });
    expect(within(group).getAllByRole('radio').map((r) => r.closest('label')?.querySelector('[lang]')?.textContent)).toEqual([
      'English',
      'हिन्दी',
      'Español',
    ]);
    expect(within(group).getByRole('radio', { name: 'English' })).toBeChecked();

    await user.click(within(group).getByRole('radio', { name: 'Español' }));

    expect(store.getState().preferences.language).toBe('es');
    await waitFor(() => expect(document.documentElement.lang).toBe('es'));
    expect(await screen.findByRole('heading', { level: 1, name: 'Ajustes' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Español' })).toBeChecked();
    await waitFor(() => expect(stored().preferences.language).toBe('es'));
    expect(await screen.findByRole('status')).toHaveTextContent('Guardado');
  });
});

describe('Settings page: profile', () => {
  it('editing the display name persists it as you type and updates the live preview', async () => {
    const user = userEvent.setup();
    const { store, container } = renderWithStore(<Page />);

    const name = screen.getByLabelText('Display name');
    expect(name).toHaveValue('Demo User');
    await user.clear(name);
    await user.type(name, 'Ada Lovelace');

    expect(store.getState().session.profile.name).toBe('Ada Lovelace');
    await waitFor(() => expect(stored().profile.name).toBe('Ada Lovelace'));
    expect(container.querySelector('[data-avatar-preview]')).toHaveTextContent('A');
    expect(await screen.findByRole('status')).toHaveTextContent('Saved');
    expect(name).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('rejects an empty name inline (min 1) and keeps the last good one', async () => {
    const user = userEvent.setup();
    const { store } = renderWithStore(<Page />);

    const name = screen.getByLabelText('Display name');
    await user.clear(name);

    const error = await screen.findByText('Enter a display name.');
    expect(error).toHaveAttribute('role', 'alert');
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveAccessibleDescription('Enter a display name.');
    expect(store.getState().session.profile.name).toBe('Demo User');
    expect(screen.getByRole('status')).toBeEmptyDOMElement();

    // Whitespace alone is empty too.
    await user.type(name, '   ');
    expect(screen.getByText('Enter a display name.')).toBeInTheDocument();
    expect(store.getState().session.profile.name).toBe('Demo User');

    await user.clear(name);
    await user.type(name, 'Sam');
    expect(screen.queryByText('Enter a display name.')).toBeNull();
    expect(store.getState().session.profile.name).toBe('Sam');
  });

  it('rejects a name over 40 characters, accepts exactly 40', async () => {
    const { store } = renderWithStore(<Page />);
    const name = screen.getByLabelText('Display name');

    fireEvent.change(name, { target: { value: 'x'.repeat(41) } });
    expect(await screen.findByText('Use 40 characters or fewer.')).toBeInTheDocument();
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(store.getState().session.profile.name).toBe('Demo User');

    fireEvent.change(name, { target: { value: 'x'.repeat(40) } });
    expect(screen.queryByText('Use 40 characters or fewer.')).toBeNull();
    expect(store.getState().session.profile.name).toBe('x'.repeat(40));
  });

  it('trims the saved name but leaves what the user typed alone while editing', async () => {
    const user = userEvent.setup();
    const { store } = renderWithStore(<Page />);

    const name = screen.getByLabelText('Display name');
    await user.clear(name);
    await user.type(name, '  Mia  ');

    expect(store.getState().session.profile.name).toBe('Mia');
    expect(name).toHaveValue('  Mia  ');
    await user.tab();
    expect(name).toHaveValue('Mia');
  });

  it('offers 8 hex avatar colours in a radiogroup; picking one persists it and recolours the preview', async () => {
    const user = userEvent.setup();
    const { store, container } = renderWithStore(<Page />);

    const group = screen.getByRole('radiogroup', { name: 'Avatar color' });
    const radios = within(group).getAllByRole('radio');
    expect(radios).toHaveLength(8);
    expect(AVATAR_COLORS).toHaveLength(8);
    for (const { hex } of AVATAR_COLORS) expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    expect(within(group).getByRole('radio', { name: 'Indigo' })).toBeChecked();

    await user.click(within(group).getByRole('radio', { name: 'Emerald' }));

    expect(store.getState().session.profile.avatarColor).toBe('#10b981');
    expect(within(group).getByRole('radio', { name: 'Emerald' })).toBeChecked();
    expect(container.querySelector<HTMLElement>('[data-avatar-preview]')?.style.backgroundColor).toBe('rgb(16, 185, 129)');
    await waitFor(() => expect(stored().profile.avatarColor).toBe('#10b981'));
    expect(await screen.findByRole('status')).toHaveTextContent('Saved');
  });

  it('restores saved values on first render (name, colour, theme, categories)', () => {
    renderWithStore(<Page />, {
      preloaded: {
        preferences: { ...DEFAULT_PREFERENCES, theme: 'dark', categories: ['health'] },
        session: {
          hydrated: false,
          email: 'ada@example.com',
          profile: { name: 'Ada', avatarColor: '#ec4899' },
        },
      },
    });

    expect(screen.getByLabelText('Display name')).toHaveValue('Ada');
    expect(screen.getByRole('radio', { name: 'Pink' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Health' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('ada@example.com')).toBeInTheDocument();
  });
});
