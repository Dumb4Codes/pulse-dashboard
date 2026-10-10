'use client';

import { useId } from 'react';
import clsx from 'clsx';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setTheme, THEMES, type Theme } from '@/store/slices/preferences';

/**
 * A miniature app drawn with one theme's own tokens. Scoping `data-theme` to the element re-declares
 * the whole token set for its subtree (see globals.css), so the swatch shows that theme's real
 * palette whichever theme the page is in. Only token utilities are used inside: a `dark:` utility
 * would key off the page's theme, not the swatch's.
 */
function MiniApp({ mode, className }: { mode: 'light' | 'dark'; className?: string }) {
  return (
    <span data-theme={mode} aria-hidden="true" className={clsx('block overflow-hidden bg-bg p-2.5 sm:p-3', className)}>
      <span className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-accent" />
        <span className="h-1.5 w-8 rounded-full bg-ink/70" />
        <span className="ml-auto h-1.5 w-4 rounded-full bg-muted/60" />
      </span>
      <span className="mt-2.5 block rounded-md border border-line bg-surface p-2">
        <span className="block h-1.5 w-4/5 rounded-full bg-ink/75" />
        <span className="mt-1.5 block h-1 w-3/5 rounded-full bg-muted/60" />
        <span className="mt-2 flex gap-1">
          <span className="h-3 w-8 rounded-full bg-accent" />
          <span className="h-3 w-3 rounded-full bg-accent-2" />
        </span>
      </span>
    </span>
  );
}

function ThemePreview({ theme }: { theme: Theme }) {
  const frame = 'h-[5.5rem] rounded-xl border border-line sm:h-28';
  if (theme !== 'system') return <MiniApp mode={theme} className={frame} />;
  // System: the light app, with the dark one cut in along a diagonal.
  return (
    <span aria-hidden="true" className={clsx('relative block overflow-hidden', frame)}>
      <MiniApp mode="light" className="size-full" />
      <MiniApp mode="dark" className="absolute inset-0 [clip-path:polygon(100%_0,100%_100%,0_100%)]" />
    </span>
  );
}

/**
 * Light / Dark / System as three preview cards in one native radio group (arrow keys, roving focus
 * and the checked state come from the browser). Choosing a theme saves at once and re-themes the
 * whole page through `ThemeSync`, so the page itself is the live preview.
 */
export function ThemePicker({ onSaved }: { onSaved: () => void }) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const theme = useAppSelector((s) => s.preferences.theme);
  const name = useId();

  return (
    <div role="radiogroup" aria-label={t('settings.theme')} className="grid grid-cols-3 gap-2.5 sm:gap-3">
      {THEMES.map((value) => {
        const checked = theme === value;
        return (
          <label key={value} className="relative block cursor-pointer">
            <input
              type="radio"
              name={name}
              value={value}
              checked={checked}
              onChange={() => {
                dispatch(setTheme(value));
                onSaved();
              }}
              className="peer sr-only"
            />
            <span
              className={clsx(
                'flex flex-col gap-2.5 rounded-2xl border bg-surface p-1.5 transition-[border-color,box-shadow,transform] duration-200 peer-active:scale-[0.98]',
                'peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-(--ring)',
                checked
                  ? 'border-ink shadow-[0_0_0_1px_var(--ink)]'
                  : 'border-line hover:border-ink/50',
              )}
            >
              <ThemePreview theme={value} />
              <span className="flex items-center justify-between gap-1 px-1.5 pb-1 text-sm font-medium">
                <span className="truncate">{t(`theme.${value}`)}</span>
                {/* Hidden on phones, where three cards leave no room for it: the thick ink outline already marks the choice. */}
                <span
                  aria-hidden="true"
                  className={clsx(
                    'grid size-5 shrink-0 place-items-center rounded-full transition-[background-color,opacity] duration-200 max-sm:hidden',
                    checked ? 'bg-ink text-bg' : 'border border-ink/35',
                  )}
                >
                  <Check className={clsx('size-3 transition-opacity duration-200', checked ? 'opacity-100' : 'opacity-0')} strokeWidth={3} />
                </span>
              </span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
