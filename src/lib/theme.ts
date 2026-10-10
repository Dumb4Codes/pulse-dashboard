import type { Theme } from '@/store/slices/preferences';

export type ResolvedTheme = 'light' | 'dark';

/** Media query that decides what the `system` theme means. */
export const DARK_QUERY = '(prefers-color-scheme: dark)';

/** `system` follows the OS; `light` / `dark` are explicit. */
export function resolveTheme(theme: Theme, systemDark: boolean): ResolvedTheme {
  if (theme === 'system') return systemDark ? 'dark' : 'light';
  return theme;
}
