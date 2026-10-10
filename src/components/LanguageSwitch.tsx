'use client';

import { Check, Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMenu } from '@/hooks/useMenu';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setLanguage, type Language } from '@/store/slices/preferences';

/** Endonyms: every language is named in its own script, so it can be found even if the UI is unreadable to you. */
const OPTIONS: readonly { code: Language; name: string; short: string }[] = [
  { code: 'en', name: 'English', short: 'EN' },
  { code: 'hi', name: 'हिन्दी', short: 'HI' },
  { code: 'es', name: 'Español', short: 'ES' },
];

/** Header language menu. Choosing a language updates `preferences.language` (persisted); `LanguageSync` does the rest. */
export function LanguageSwitch() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const current = useAppSelector((s) => s.preferences.language);
  const { open, close, rootRef, triggerRef, menuRef, triggerProps, menuProps } = useMenu();
  const active = OPTIONS.find((option) => option.code === current) ?? OPTIONS[0];

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        {...triggerProps}
        aria-label={`${t('settings.language')}: ${active.name}`}
        className="flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl px-2.5 text-ink transition-colors hover:bg-ink/5 active:scale-95 aria-expanded:bg-ink/5"
      >
        <Languages aria-hidden="true" className="size-5" strokeWidth={1.75} />
        <span aria-hidden="true" className="text-xs font-medium tracking-[0.08em] max-sm:hidden">
          {active.short}
        </span>
      </button>

      {open && (
        <div
          ref={menuRef}
          {...menuProps}
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-48 origin-top-right animate-menu-in rounded-2xl border border-line bg-surface p-1 shadow-[var(--shadow)]"
        >
          {OPTIONS.map((option) => {
            const checked = option.code === current;
            return (
              <button
                key={option.code}
                type="button"
                role="menuitemradio"
                aria-checked={checked}
                lang={option.code}
                tabIndex={-1}
                onClick={() => {
                  dispatch(setLanguage(option.code));
                  close();
                }}
                className="flex h-11 w-full items-center justify-between gap-3 rounded-xl px-3 text-left text-[0.9375rem] font-medium text-ink transition-colors hover:bg-ink/5 focus-visible:bg-ink/5"
              >
                {option.name}
                {checked && <Check aria-hidden="true" className="size-4 text-accent-2" strokeWidth={2.25} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
