'use client';

import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useResolvedTheme } from '@/hooks/useResolvedTheme';
import { useAppDispatch } from '@/store/hooks';
import { setTheme } from '@/store/slices/preferences';

/**
 * Light / dark switch. The button is a plain toggle button (`aria-pressed` = dark is on) over the
 * *resolved* theme, so it behaves sensibly while the preference is still `system`; choosing
 * "System" again lives in Settings. The sun-to-moon morph is CSS-only and keyed off
 * `<html data-theme>` (set before first paint), so it is correct with no JS and cannot flash.
 */
export function ThemeToggle() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const dark = useResolvedTheme() === 'dark';

  return (
    <button
      type="button"
      aria-pressed={dark}
      aria-label={t('theme.toggle')}
      onClick={() => dispatch(setTheme(dark ? 'light' : 'dark'))}
      className="relative grid size-11 place-items-center rounded-xl text-ink transition-colors hover:bg-ink/5 active:scale-95"
    >
      <Sun
        aria-hidden="true"
        strokeWidth={1.75}
        className="absolute size-5 transition-[transform,opacity] duration-300 ease-out-expo dark:-rotate-90 dark:scale-50 dark:opacity-0"
      />
      <Moon
        aria-hidden="true"
        strokeWidth={1.75}
        className="absolute size-5 rotate-90 scale-50 opacity-0 transition-[transform,opacity] duration-300 ease-out-expo dark:rotate-0 dark:scale-100 dark:opacity-100"
      />
    </button>
  );
}
