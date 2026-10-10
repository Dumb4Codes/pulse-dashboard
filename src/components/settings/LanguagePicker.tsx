'use client';

import { useId } from 'react';
import clsx from 'clsx';
import { Check } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setLanguage, type Language } from '@/store/slices/preferences';

/**
 * Each language is named, and greeted, in its own script and carries its own `lang`, so it can be
 * found (and read aloud correctly) even when the current UI language is unreadable to you. The
 * greeting is decoration; the endonym is the accessible name.
 */
const OPTIONS: readonly { code: Language; name: string; greeting: string }[] = [
  { code: 'en', name: 'English', greeting: 'Good morning' },
  { code: 'hi', name: 'हिन्दी', greeting: 'सुप्रभात' },
  { code: 'es', name: 'Español', greeting: 'Buenos días' },
];

/**
 * Three radio cards (native radios: arrows, roving focus). Choosing one saves at once;
 * `LanguageSync` then switches i18next and `<html lang>`, so the whole page re-renders in it.
 * `labelledBy` is the id of the section heading.
 */
export function LanguagePicker({ labelledBy, onSaved }: { labelledBy: string; onSaved: () => void }) {
  const dispatch = useAppDispatch();
  const current = useAppSelector((s) => s.preferences.language);
  const name = useId();

  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className="grid gap-2.5 sm:gap-3">
      {OPTIONS.map((option) => {
        const checked = current === option.code;
        return (
          <label key={option.code} className="relative block cursor-pointer">
            <input
              type="radio"
              name={name}
              value={option.code}
              checked={checked}
              onChange={() => {
                dispatch(setLanguage(option.code));
                onSaved();
              }}
              className="peer sr-only"
            />
            <span
              className={clsx(
                'flex items-center gap-4 rounded-2xl border bg-surface px-4 py-3.5 transition-[border-color,box-shadow,transform,background-color] duration-200 peer-active:scale-[0.99]',
                'peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-(--ring)',
                checked
                  ? 'border-ink bg-surface-2 shadow-[0_0_0_1px_var(--ink)]'
                  : 'border-line hover:border-ink/50',
              )}
            >
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span lang={option.code} className="truncate font-display text-xl/[1.3] font-medium tracking-[-0.01em]">
                  {option.name}
                </span>
                <span aria-hidden="true" lang={option.code} className="truncate text-sm text-muted">
                  {option.greeting}
                </span>
              </span>
              <span aria-hidden="true" className="text-xs font-medium uppercase tracking-[0.12em] text-muted">
                {option.code}
              </span>
              <span
                aria-hidden="true"
                className={clsx(
                  'grid size-6 shrink-0 place-items-center rounded-full transition-colors duration-200',
                  checked ? 'bg-ink text-bg' : 'border border-ink/35',
                )}
              >
                <Check className={clsx('size-3.5 transition-opacity duration-200', checked ? 'opacity-100' : 'opacity-0')} strokeWidth={3} />
              </span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
