import { CATEGORIES } from '../categories';
import type { ContentItem } from '../types';
import { NEWS_SEEDS, NEWS_SOURCES, SOCIAL_SEEDS } from './mockData';

/** SSE cadence in seconds: default and the clamp applied to `?interval=`. */
export const DEFAULT_INTERVAL_S = 20;
export const MIN_INTERVAL_S = 1;
export const MAX_INTERVAL_S = 60;

/**
 * Reads the `interval` query value: whole seconds, clamped to 1-60, 20 when missing or not a number.
 * (Lives here, not in the route file, because Next only allows HTTP handlers and route config to be
 * exported from a `route.ts`.)
 */
export function parseInterval(raw: string | null): number {
  const n = raw === null ? Number.NaN : Number.parseFloat(raw);
  if (Number.isNaN(n)) return DEFAULT_INTERVAL_S;
  return Math.min(MAX_INTERVAL_S, Math.max(MIN_INTERVAL_S, Math.floor(n)));
}

/**
 * The `n`th item of the simulated live wire: even `n` is a news story (categories cycle, so each
 * one gets its turn), odd `n` is a post from the social seeds. Headlines carry a "Just in:" prefix
 * so a live story is never mistaken for a duplicate of the seeded story it was derived from.
 * `id` is `live-${now}`, `publishedAt` is `now`.
 */
export function makeLiveItem(n: number, now: number = Date.now()): ContentItem {
  const id = `live-${now}`;
  const shared = {
    id,
    image: `https://picsum.photos/seed/${id}/800/520`,
    url: `https://example.com/${id}`,
    publishedAt: new Date(now).toISOString(),
    score: 50 + (n % 50),
  };

  if (n % 2 === 0) {
    const k = n / 2;
    const category = CATEGORIES[k % CATEGORIES.length];
    const seeds = NEWS_SEEDS[category];
    const seed = seeds[Math.floor(k / CATEGORIES.length) % seeds.length];
    return {
      ...shared,
      type: 'news',
      category,
      title: `Just in: ${seed.title}`,
      description: seed.description,
      source: NEWS_SOURCES[k % NEWS_SOURCES.length],
    };
  }

  const seed = SOCIAL_SEEDS[((n - 1) / 2) % SOCIAL_SEEDS.length];
  return {
    ...shared,
    type: 'social',
    category: seed.category,
    title: `@${seed.handle}`,
    description: seed.text,
    source: 'Pulse Social',
    author: seed.author,
  };
}
