'use client';

import { useEffect } from 'react';
import { useResolvedTheme } from '@/hooks/useResolvedTheme';
import { useAppSelector } from '@/store/hooks';

/**
 * Mirrors the resolved theme onto `<html data-theme>`, which drives every CSS token.
 * Waits for hydration: until the persisted preference is loaded the store still holds the
 * `system` default, and writing it would overwrite the value the pre-paint inline script in
 * `app/layout.tsx` already set from localStorage (a visible light/dark flash).
 */
export function ThemeSync() {
  const hydrated = useAppSelector((s) => s.session.hydrated);
  const resolved = useResolvedTheme();

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.dataset.theme = resolved;
  }, [hydrated, resolved]);

  return null;
}
