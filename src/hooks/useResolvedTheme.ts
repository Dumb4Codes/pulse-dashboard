'use client';

import { useSyncExternalStore } from 'react';
import { DARK_QUERY, resolveTheme, type ResolvedTheme } from '@/lib/theme';
import { useAppSelector } from '@/store/hooks';

function subscribe(onChange: () => void): () => void {
  if (typeof window.matchMedia !== 'function') return () => {};
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

const getSnapshot = (): boolean =>
  typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches;

/** The server cannot know the OS preference; hydration re-reads it on the client without a mismatch error. */
const getServerSnapshot = (): boolean => false;

/** `preferences.theme` resolved against the live OS setting. Re-renders when the OS flips while on `system`. */
export function useResolvedTheme(): ResolvedTheme {
  const theme = useAppSelector((s) => s.preferences.theme);
  const systemDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return resolveTheme(theme, systemDark);
}
