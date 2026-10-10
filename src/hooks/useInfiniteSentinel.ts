'use client';

import { useCallback, useEffect, useRef, type RefCallback } from 'react';

/**
 * Calls `onHit` whenever the element that receives the returned ref comes within 400px of the
 * viewport (an `IntersectionObserver` with `rootMargin: '400px'`, so the next page starts loading
 * before the reader reaches the end).
 *
 * `enabled` is what makes this safe to chain. While it is false nothing is observed; when it turns
 * true a *new* observer is created, and a new observer always reports the sentinel's current state
 * straight away. So if one page was too short to push the sentinel out of range, the next load
 * fires by itself instead of waiting for a scroll that never comes.
 *
 * `onHit` may change identity on every render: the latest one is always the one called.
 */
export function useInfiniteSentinel(onHit: () => void, enabled: boolean): RefCallback<HTMLElement> {
  const latest = useRef(onHit);
  useEffect(() => {
    latest.current = onHit;
  });

  return useCallback<RefCallback<HTMLElement>>(
    (node) => {
      if (!node || !enabled || typeof IntersectionObserver === 'undefined') return;
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) latest.current();
        },
        { rootMargin: '400px' },
      );
      observer.observe(node);
      return () => observer.disconnect();
    },
    [enabled],
  );
}
