/** Most hashtags a person can follow. Mirrors the cap the persistence layer enforces on load (`store/persist.ts`). */
export const MAX_HASHTAGS = 10;

/** A stored hashtag: lower-case letters, digits and underscores, 1 to 30 long (same rule as `store/persist.ts`). */
const HASHTAG_RE = /^[a-z0-9_]{1,30}$/;

/**
 * Turns what was typed into the stored form: trims, drops any leading `#`s and lower-cases.
 * Returns `null` when the result is not a valid hashtag (empty, too long, spaces, markup, accents...).
 * The result only ever contains `[a-z0-9_]`, so it is safe to render and to put in a query string.
 */
export function parseHashtag(raw: string): string | null {
  const tag = raw.trim().replace(/^#+/, '').toLowerCase();
  return HASHTAG_RE.test(tag) ? tag : null;
}
