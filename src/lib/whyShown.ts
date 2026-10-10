import type { Category, ContentItem } from './types';

export type WhyShown =
  | { kind: 'hashtag'; tag: string }
  | { kind: 'category' }
  | { kind: 'other' };

/** `#tag` must end at a hashtag boundary, so `#tech` does not match `#technology`. */
function mentions(text: string, tag: string): boolean {
  return new RegExp(`#${tag}(?![a-z0-9_])`).test(text);
}

/**
 * The honest reason an item is in front of the reader, derived only from their saved preferences:
 * a followed hashtag it mentions, else a followed category, else neither (it arrived through search,
 * trending, favorites or the live wire). Hashtags only ever apply to posts.
 */
export function whyShown(item: ContentItem, categories: readonly Category[], hashtags: readonly string[]): WhyShown {
  if (item.type === 'social') {
    const text = `${item.title} ${item.description}`.toLowerCase();
    const tag = hashtags.find((candidate) => mentions(text, candidate));
    if (tag) return { kind: 'hashtag', tag };
  }
  return categories.includes(item.category) ? { kind: 'category' } : { kind: 'other' };
}
