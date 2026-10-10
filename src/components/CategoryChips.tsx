'use client';

import clsx from 'clsx';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CATEGORIES } from '@/lib/categories';
import type { Category } from '@/lib/types';

interface CategoryChipsProps {
  selected: readonly Category[];
  onToggle: (category: Category) => void;
  /**
   * Called instead of `onToggle` when the user tries to remove the only selected category, so the
   * page can explain why nothing happened (e.g. an `aria-live` hint using `settings.keepOneCategory`).
   */
  onBlocked?: (category: Category) => void;
  /**
   * Below the `sm` breakpoint keep the chips on one row that scrolls sideways (a quick filter
   * should not eat a third of a phone screen). From `sm` up they wrap as usual. The caller supplies
   * any edge bleed (`max-sm:-mx-4 max-sm:px-4`) because only it knows the page gutter.
   */
  scrollable?: boolean;
  className?: string;
}

/**
 * Multi-select filter over the seven categories: a labelled group of toggle buttons (`aria-pressed`).
 * The feed must never have zero categories (the store enforces it), so when exactly one is selected
 * its chip is `aria-disabled` with an explanatory tooltip and calls `onBlocked` (not `onToggle`). It
 * stays focusable, so the explanation is reachable by keyboard.
 *
 * The selection ring reserves its space whether or not it is ticked, so toggling never reflows the
 * wrapped rows.
 */
export function CategoryChips({ selected, onToggle, onBlocked, scrollable = false, className }: CategoryChipsProps) {
  const { t } = useTranslation();
  const onlyOne = selected.length <= 1;

  return (
    <div
      role="group"
      aria-label={t('settings.categories')}
      className={clsx(
        'flex flex-wrap gap-2',
        // `py-1.5` / `-my-1.5`: overflow-x forces overflow-y to clip, so the focus ring (3px + 2px offset) needs room inside.
        scrollable &&
          'max-sm:-my-1.5 max-sm:flex-nowrap max-sm:snap-x max-sm:overflow-x-auto max-sm:overscroll-x-contain max-sm:py-1.5 max-sm:[scrollbar-width:none] max-sm:[&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      {CATEGORIES.map((category) => {
        const on = selected.includes(category);
        const locked = on && onlyOne;
        return (
          <button
            key={category}
            type="button"
            aria-pressed={on}
            aria-disabled={locked || undefined}
            title={locked ? t('settings.keepOneCategory') : undefined}
            onClick={() => {
              if (locked) onBlocked?.(category);
              else onToggle(category);
            }}
            className={clsx(
              'inline-flex h-11 items-center gap-2 rounded-full border pl-3 pr-4 text-sm font-medium transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.97] sm:h-10 pointer-coarse:h-11',
              scrollable && 'max-sm:shrink-0 max-sm:snap-start max-sm:scroll-mx-4',
              on
                ? 'border-ink bg-ink text-bg aria-disabled:cursor-not-allowed'
                : 'border-ink/25 bg-surface text-ink hover:border-ink/50 hover:bg-surface-2',
            )}
          >
            <span
              aria-hidden="true"
              className={clsx(
                'grid size-4 shrink-0 place-items-center rounded-full border transition-colors duration-150',
                on ? 'border-bg/45 bg-bg/15' : 'border-ink/35',
              )}
            >
              <Check className={clsx('size-3 transition-opacity duration-150', on ? 'opacity-100' : 'opacity-0')} strokeWidth={3} />
            </span>
            {t(`category.${category}`)}
          </button>
        );
      })}
    </div>
  );
}
