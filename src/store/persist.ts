import { CATEGORIES } from '@/lib/categories';
import type { Category, ContentItem, ContentType } from '@/lib/types';
import type { PersistedState } from './actions';
import type { FavoritesState } from './slices/favorites';
import type { FeedOrderState } from './slices/feedOrder';
import { DEFAULT_PREFERENCES, LANGUAGES, THEMES, type PreferencesState } from './slices/preferences';
import { MAX_RECENT, type RecentState } from './slices/recent';
import { DEFAULT_PROFILE, type Profile, type SessionState } from './slices/session';

export const STORAGE_KEY = 'pulse:v1';
const VERSION = 1;

const HASHTAG_RE = /^[a-z0-9_]{1,30}$/;
const COLOR_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const MAX_HASHTAGS = 10;
const MAX_ORDER_IDS = 500;
const MAX_NAME = 40;
const CONTENT_TYPES: readonly ContentType[] = ['news', 'movie', 'social'];

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isCategory = (v: unknown): v is Category => (CATEGORIES as readonly unknown[]).includes(v);
const isOneOf = <T extends string>(list: readonly T[], v: unknown): v is T => (list as readonly unknown[]).includes(v);
const unique = <T,>(xs: T[]): T[] => [...new Set(xs)];

/** Returns undefined when the input is absent/unusable so the caller can omit the key entirely. */
function sanitizePrefs(input: unknown): PreferencesState | undefined {
  if (!isRecord(input)) return undefined;
  const categories = Array.isArray(input.categories) ? unique(input.categories.filter(isCategory)) : [];
  const hashtags = Array.isArray(input.hashtags)
    ? unique(input.hashtags.filter((t): t is string => typeof t === 'string' && HASHTAG_RE.test(t))).slice(0, MAX_HASHTAGS)
    : [...DEFAULT_PREFERENCES.hashtags];
  return {
    theme: isOneOf(THEMES, input.theme) ? input.theme : DEFAULT_PREFERENCES.theme,
    language: isOneOf(LANGUAGES, input.language) ? input.language : DEFAULT_PREFERENCES.language,
    categories: categories.length ? categories : [...DEFAULT_PREFERENCES.categories],
    hashtags,
  };
}

function sanitizeItem(v: unknown): ContentItem | undefined {
  if (!isRecord(v)) return undefined;
  const { id, type, category, title, description, image, url, source, author, publishedAt, score } = v;
  if (
    typeof id !== 'string' || !id ||
    !isOneOf(CONTENT_TYPES, type) || !isCategory(category) ||
    typeof title !== 'string' || typeof description !== 'string' || typeof image !== 'string' ||
    typeof url !== 'string' || typeof source !== 'string' || typeof publishedAt !== 'string' ||
    typeof score !== 'number' || !Number.isFinite(score)
  ) return undefined;
  const item: ContentItem = { id, type, category, title, description, image, url, source, publishedAt, score };
  if (typeof author === 'string') item.author = author;
  return item;
}

function sanitizeFavorites(input: unknown): FavoritesState | undefined {
  if (!isRecord(input)) return undefined;
  const byId: Record<string, ContentItem> = {};
  if (isRecord(input.byId)) {
    for (const v of Object.values(input.byId)) {
      const item = sanitizeItem(v);
      if (item) byId[item.id] = item;
    }
  }
  return { byId };
}

function sanitizeRecent(input: unknown): RecentState | undefined {
  if (!isRecord(input) || !Array.isArray(input.items)) return undefined;
  const seen = new Set<string>();
  const items: ContentItem[] = [];
  for (const v of input.items) {
    const item = sanitizeItem(v);
    if (!item || seen.has(item.id)) continue;
    seen.add(item.id);
    items.push(item);
  }
  return { items: items.slice(0, MAX_RECENT) };
}

function sanitizeOrder(input: unknown): FeedOrderState | undefined {
  if (!isRecord(input)) return undefined;
  const ids = Array.isArray(input.ids) ? input.ids.filter((x): x is string => typeof x === 'string') : [];
  return { ids: unique(ids).slice(0, MAX_ORDER_IDS) };
}

function sanitizeProfile(input: unknown): Profile | undefined {
  if (!isRecord(input)) return undefined;
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  return {
    name: name.length >= 1 && name.length <= MAX_NAME ? name : DEFAULT_PROFILE.name,
    avatarColor:
      typeof input.avatarColor === 'string' && COLOR_RE.test(input.avatarColor)
        ? input.avatarColor
        : DEFAULT_PROFILE.avatarColor,
  };
}

/**
 * Reads + validates persisted state. NEVER throws: unavailable/throwing storage, corrupt JSON,
 * a non-object payload or a different schema version all yield `{}` (app falls back to defaults).
 * Invalid individual fields are repaired; keys missing from storage are omitted.
 */
export function loadPersisted(): Partial<PersistedState> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const x: unknown = JSON.parse(raw);
    if (!isRecord(x) || x.v !== VERSION) return {};
    const out: Partial<PersistedState> = {};
    const preferences = sanitizePrefs(x.preferences);
    const favorites = sanitizeFavorites(x.favorites);
    const feedOrder = sanitizeOrder(x.feedOrder);
    const profile = sanitizeProfile(x.profile);
    const recent = sanitizeRecent(x.recent);
    if (preferences) out.preferences = preferences;
    if (favorites) out.favorites = favorites;
    if (feedOrder) out.feedOrder = feedOrder;
    if (profile) out.profile = profile;
    if (recent) out.recent = recent;
    return out;
  } catch {
    return {};
  }
}

/** Writes the persisted payload. NEVER throws (quota exceeded, storage blocked, etc. are ignored). */
export function savePersisted(s: PersistedState): void {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ v: VERSION, preferences: s.preferences, favorites: s.favorites, feedOrder: s.feedOrder, profile: s.profile, recent: s.recent }),
    );
  } catch {
    // Persistence is best-effort; the in-memory state stays authoritative.
  }
}

/** Selects the persisted subset from the store state (`session.profile` becomes `profile`). */
export function pickPersisted(s: {
  preferences: PreferencesState;
  favorites: FavoritesState;
  feedOrder: FeedOrderState;
  session: SessionState;
  recent: RecentState;
}): PersistedState {
  return {
    preferences: s.preferences,
    favorites: s.favorites,
    feedOrder: s.feedOrder,
    profile: s.session.profile,
    recent: s.recent,
  };
}
