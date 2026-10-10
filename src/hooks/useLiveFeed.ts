'use client';

import { useEffect } from 'react';
import { CATEGORIES } from '@/lib/categories';
import type { ContentItem, ContentType } from '@/lib/types';
import { useAppDispatch } from '@/store/hooks';
import { liveReceived } from '@/store/slices/live';

const TYPES: readonly ContentType[] = ['news', 'movie', 'social'];

const isString = (value: unknown): value is string => typeof value === 'string';

/** The wire is untrusted: only well-formed items reach the store (and, from there, the DOM). */
function isContentItem(value: unknown): value is ContentItem {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    isString(v.id) && v.id !== '' &&
    isString(v.type) && (TYPES as readonly string[]).includes(v.type) &&
    isString(v.category) && (CATEGORIES as readonly string[]).includes(v.category) &&
    isString(v.title) &&
    isString(v.description) &&
    isString(v.image) &&
    isString(v.url) &&
    isString(v.source) &&
    isString(v.publishedAt) &&
    typeof v.score === 'number'
  );
}

/**
 * Subscribes to `/api/stream` (server-sent events) for as long as the caller is mounted and puts
 * every well-formed item into the store as "pending" (the feed shows them behind the new-items
 * pill; it never rearranges what the reader is looking at). Malformed messages are dropped.
 * `EventSource` reconnects by itself after a network drop; the connection closes on unmount.
 */
export function useLiveFeed(): void {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (typeof EventSource === 'undefined') return;
    const source = new EventSource('/api/stream');

    source.onmessage = (event: MessageEvent<string>) => {
      let data: unknown;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      if (isContentItem(data)) dispatch(liveReceived(data));
    };

    return () => source.close();
  }, [dispatch]);
}
