import { CATEGORIES, MAX_PAGES, PAGE_SIZE } from '../categories';
import { interleave } from '../interleave';
import type { Params } from '../params';
import type { Category, ContentItem, ContentType, Page } from '../types';
import { MOVIE_SEEDS, NEWS_SEEDS, NEWS_SOURCES, SOCIAL_SEEDS } from './mockData';

/** Each seed list is replayed this many times ("editions") so single-category feeds can still reach page 5. */
const EDITIONS = 7;
const BASE_TIME = Date.UTC(2026, 0, 1);
const HOUR_MS = 3_600_000;

interface NormalizedSeed { category: Category; seedIndex: number; title: string; description: string; source?: string; author?: string }

/** FNV-1a: small, deterministic, dependency-free. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

function seedsFor(type: ContentType): NormalizedSeed[] {
  switch (type) {
    case 'news':
      return CATEGORIES.flatMap(category => NEWS_SEEDS[category].map((s, seedIndex) => ({
        category, seedIndex, title: s.title, description: s.description,
        source: NEWS_SOURCES[hash(`${category}-${seedIndex}`) % NEWS_SOURCES.length],
      })));
    case 'movie':
      return MOVIE_SEEDS.map((s, seedIndex) => ({
        category: s.category, seedIndex, title: s.title, description: `${s.description} (${s.year})`, source: 'Pulse Cinema',
      }));
    case 'social':
      return SOCIAL_SEEDS.map((s, seedIndex) => ({
        category: s.category, seedIndex, title: `@${s.handle}`, description: s.text, author: s.author, source: 'Pulse Social',
      }));
  }
}

interface PoolEntry { item: ContentItem; edition: number }
type Pool = Record<Category, PoolEntry[]>;

function buildPool(type: ContentType): Pool {
  const seeds = seedsFor(type);
  const byCategory = Object.fromEntries(CATEGORIES.map(c => [c, [] as PoolEntry[]])) as Pool;
  for (let edition = 0; edition < EDITIONS; edition++) {
    seeds.forEach((seed, pos) => {
      const id = `${type}-${seed.category}-${seed.seedIndex}-${edition}`;
      const index = edition * seeds.length + pos;
      const repeat = edition > 0;
      const item: ContentItem = {
        id,
        type,
        category: seed.category,
        // Repeated seeds get distinct titles (social titles are handles, so the text carries the marker instead).
        title: repeat && type !== 'social' ? `${seed.title} — Part ${edition + 1}` : seed.title,
        description: repeat && type === 'social' ? `${seed.description} (repost ${edition})` : seed.description,
        image: `https://picsum.photos/seed/${id}/800/520`,
        url: `https://example.com/${id}`,
        source: seed.source ?? 'Pulse',
        publishedAt: new Date(BASE_TIME + index * HOUR_MS).toISOString(),
        score: hash(id) % 100,
      };
      if (seed.author) item.author = seed.author;
      byCategory[seed.category].push({ item, edition });
    });
  }
  return byCategory;
}

const poolCache = new Map<ContentType, Pool>();
function poolFor(type: ContentType): Pool {
  let pool = poolCache.get(type);
  if (!pool) { pool = buildPool(type); poolCache.set(type, pool); }
  return pool;
}

/** `#tag` must end at a hashtag boundary, so `#tech` does not match `#technology`. */
function hasTag(text: string, tag: string): boolean {
  return new RegExp(`#${tag}(?![a-z0-9_])`).test(text);
}

/**
 * Deterministic mock page: filters by categories / q / tags (tags apply to social only),
 * interleaves categories so they alternate, and returns PAGE_SIZE items per page.
 */
export function mockPage(type: ContentType, p: Params): Page {
  const pool = poolFor(type);
  const q = p.q.toLowerCase();
  const tagged = type === 'social' && p.tags.length > 0;
  // Repeated editions only exist to give browsing enough depth; a narrowing query would just list the same hit again.
  const firstEditionOnly = q !== '' || tagged;
  const matches = ({ item, edition }: PoolEntry): boolean => {
    if (firstEditionOnly && edition > 0) return false;
    if (q && !`${item.title} ${item.description}`.toLowerCase().includes(q)) return false;
    if (tagged) {
      const text = item.description.toLowerCase();
      if (!p.tags.some(tag => hasTag(text, tag))) return false;
    }
    return true;
  };
  const filtered = interleave(p.categories.map(c => pool[c].filter(matches).map(e => e.item)));
  const start = (p.page - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  return {
    items: filtered.slice(start, end).map(item => ({ ...item })),
    nextPage: p.page < MAX_PAGES && end < filtered.length ? p.page + 1 : null,
    source: 'mock',
  };
}

const MOCK_ID_RE = /^(news|movie|social)-([a-z]+)-\d+-\d+$/;

/**
 * Looks one mock item up by id (`type-category-seedIndex-edition`), so a details page can be opened
 * from a bookmark or a shared link, not only from a card that is already in memory. Returns null for
 * anything that is not a mock id, including live-wire ids (`live-<timestamp>`) and real API ids.
 */
export function findMockItem(id: string): ContentItem | null {
  const match = MOCK_ID_RE.exec(id);
  if (!match) return null;
  const [, type, category] = match as unknown as [string, ContentType, Category];
  if (!(CATEGORIES as readonly string[]).includes(category)) return null;
  const entry = poolFor(type)[category].find(({ item }) => item.id === id);
  return entry ? { ...entry.item } : null;
}
