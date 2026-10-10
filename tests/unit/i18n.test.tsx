import fs from 'node:fs';
import path from 'node:path';
import { act, screen } from '@testing-library/react';
import { Sidebar } from '@/components/Sidebar';
import { CATEGORIES } from '@/lib/categories';
import i18n from '@/lib/i18n';
import en from '@/locales/en.json';
import es from '@/locales/es.json';
import hi from '@/locales/hi.json';
import { DEFAULT_PREFERENCES, LANGUAGES, setLanguage } from '@/store/slices/preferences';
import { renderWithStore } from '../helpers';

vi.mock('next/navigation', () => ({ usePathname: () => '/' }));

type Tree = { [key: string]: string | Tree };
const LOCALES = { en, hi, es } as const satisfies Record<string, Tree>;

/** { a: { b: 'x' } } -> { 'a.b': 'x' } */
function flatten(tree: Tree, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out[path] = value;
    else Object.assign(out, flatten(value, path));
  }
  return out;
}

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;
/** i18next plural forms (`key_one`, `key_other`, ...) collapse to one logical key. */
const baseKey = (key: string) => key.replace(PLURAL_SUFFIX, '');
const baseKeys = (flat: Record<string, string>) => [...new Set(Object.keys(flat).map(baseKey))].sort();
const placeholders = (value: string) => [...value.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]).sort();

const flat = { en: flatten(en), hi: flatten(hi), es: flatten(es) };

/** Keys whose value is legitimately identical to English (identifiers / loanwords). */
const SAME_AS_ENGLISH: Record<'hi' | 'es', readonly string[]> = {
  hi: ['auth.emailPlaceholder'],
  es: ['auth.emailPlaceholder', 'nav.feed', 'settings.hashtags'],
};

afterEach(async () => {
  await i18n.changeLanguage('en');
});

describe('locale files', () => {
  it('cover exactly the three supported languages', () => {
    expect(Object.keys(LOCALES).sort()).toEqual([...LANGUAGES].sort());
  });

  it.each(['hi', 'es'] as const)('%s.json has the same keys as en.json', (locale) => {
    expect(baseKeys(flat[locale])).toEqual(baseKeys(flat.en));
  });

  it('contains the full key set the plan promises (every task relies on these)', () => {
    const required = [
      'nav.feed', 'nav.trending', 'nav.favorites', 'nav.settings',
      'header.search', 'header.searchHint',
      'account.signOut', 'account.profile',
      'feed.title', 'feed.subtitle', 'feed.empty.title', 'feed.empty.body', 'feed.error.title', 'feed.error.body',
      'feed.retry', 'feed.loadingMore', 'feed.endReached', 'feed.newItems',
      'card.read', 'card.play', 'card.view', 'card.favorite', 'card.unfavorite', 'card.drag',
      'trending.title', 'trending.news', 'trending.movies', 'trending.posts',
      'favorites.title', 'favorites.empty.title', 'favorites.empty.body',
      'settings.title', 'settings.categories', 'settings.hashtags', 'settings.theme', 'settings.language',
      'settings.profile', 'settings.name', 'settings.avatarColor', 'settings.saved',
      'search.placeholder', 'search.noResults', 'search.news', 'search.movies', 'search.social', 'search.minChars',
      'auth.login', 'auth.signup', 'auth.email', 'auth.password', 'auth.demo', 'auth.invalid',
      'theme.light', 'theme.dark', 'theme.system',
      ...CATEGORIES.map((c) => `category.${c}`),
      'sr.skipToContent', 'sr.moved',
    ];
    const have = new Set(baseKeys(flat.en));
    expect(required.filter((key) => !have.has(key))).toEqual([]);
  });

  it.each(['en', 'hi', 'es'] as const)('%s.json has no empty strings', (locale) => {
    expect(Object.entries(flat[locale]).filter(([, value]) => value.trim() === '')).toEqual([]);
  });

  it.each(['hi', 'es'] as const)('%s.json keeps the same {{placeholders}} as English for every key', (locale) => {
    const mismatched = Object.keys(flat[locale]).filter((key) => {
      const enKey = flat.en[key] ?? flat.en[`${baseKey(key)}_other`];
      return JSON.stringify(placeholders(flat[locale][key])) !== JSON.stringify(placeholders(enKey ?? ''));
    });
    expect(mismatched).toEqual([]);
  });

  it.each(['en', 'hi', 'es'] as const)('%s.json defines every plural form its language needs', (locale) => {
    const categories = new Intl.PluralRules(locale).resolvedOptions().pluralCategories;
    const pluralBases = [...new Set(Object.keys(flat.en).filter((k) => PLURAL_SUFFIX.test(k)).map(baseKey))];
    expect(pluralBases).toContain('feed.newItems');
    for (const base of pluralBases) {
      for (const category of categories) expect(flat[locale]).toHaveProperty([`${base}_${category}`]);
    }
  });

  it.each(['hi', 'es'] as const)('%s.json is really translated (no copy-pasted English)', (locale) => {
    const untranslated = Object.keys(flat[locale]).filter(
      (key) => flat[locale][key] === flat.en[key] && !SAME_AS_ENGLISH[locale].includes(key),
    );
    expect(untranslated).toEqual([]);
  });

  it('Hindi strings are written in Devanagari', () => {
    const devanagari = /\p{Script=Devanagari}/u;
    const latinOnly = Object.entries(flat.hi).filter(
      ([key, value]) => !devanagari.test(value) && !SAME_AS_ENGLISH.hi.includes(key),
    );
    expect(latinOnly).toEqual([]);
  });

  it('every literal t() key used in src/ exists in en.json', () => {
    const namespaces = Object.keys(en).join('|');
    const literal = new RegExp(`(['"])((?:${namespaces})\\.[A-Za-z0-9_.]+)\\1`, 'g');
    const known = new Set(Object.keys(flat.en));
    const exists = (key: string) =>
      known.has(key) || known.has(`${key}_other`) || [...known].some((k) => k.startsWith(`${key}.`));

    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.tsx?$/.test(entry.name)) files.push(full);
      }
    };
    walk(path.resolve(__dirname, '../../src'));

    const missing: string[] = [];
    for (const file of files) {
      for (const match of fs.readFileSync(file, 'utf8').matchAll(literal)) {
        if (!exists(match[2])) missing.push(`${path.relative(process.cwd(), file)}: ${match[2]}`);
      }
    }
    expect(missing).toEqual([]);
  });
});

describe('i18n runtime', () => {
  it('starts in English and falls back to English for unknown keys/locales', () => {
    expect(i18n.t('nav.favorites')).toBe('Favorites');
    expect(i18n.options.fallbackLng).toEqual(['en']);
  });

  it('pluralises feed.newItems per language', async () => {
    expect(i18n.t('feed.newItems', { count: 1 })).toBe('1 new item');
    expect(i18n.t('feed.newItems', { count: 3 })).toBe('3 new items');
    await i18n.changeLanguage('es');
    expect(i18n.t('feed.newItems', { count: 1 })).toBe('1 elemento nuevo');
    expect(i18n.t('feed.newItems', { count: 4 })).toBe('4 elementos nuevos');
    await i18n.changeLanguage('hi');
    expect(i18n.t('feed.newItems', { count: 1 })).toBe('1 नया आइटम');
    expect(i18n.t('feed.newItems', { count: 5 })).toBe('5 नए आइटम');
  });

  it('interpolates sr.moved without HTML-escaping (React escapes at render time)', () => {
    expect(i18n.t('sr.moved', { title: 'Fish & Chips', pos: 1, total: 9 })).toBe(
      'Moved Fish & Chips to position 1 of 9',
    );
  });
});

describe('language follows the store', () => {
  it('re-renders the Sidebar in Spanish when preferences.language becomes "es"', async () => {
    const { store } = renderWithStore(<Sidebar />);
    expect(screen.getByText('Favorites')).toBeInTheDocument();
    expect(screen.queryByText('Favoritos')).not.toBeInTheDocument();

    act(() => {
      store.dispatch(setLanguage('es'));
    });
    expect(await screen.findByText('Favoritos')).toBeInTheDocument();
    expect(screen.queryByText('Favorites')).not.toBeInTheDocument();
    expect(document.documentElement.lang).toBe('es');
  });

  it('switches to Hindi and back, keeping <html lang> in step', async () => {
    const { store } = renderWithStore(<Sidebar />);
    act(() => {
      store.dispatch(setLanguage('hi'));
    });
    expect(await screen.findByText('पसंदीदा')).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('hi');

    act(() => {
      store.dispatch(setLanguage('en'));
    });
    expect(await screen.findByText('Favorites')).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en');
  });

  it('honours a persisted non-English language on first render', async () => {
    renderWithStore(<Sidebar />, { preloaded: { preferences: { ...DEFAULT_PREFERENCES, language: 'es' } } });
    expect(await screen.findByText('Tendencias')).toBeInTheDocument();
  });
});
