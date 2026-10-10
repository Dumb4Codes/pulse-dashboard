'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EASE_IN, EASE_OUT } from '@/lib/motion';

/**
 * Drives the "Saved" toast. Settings save the moment something changes, so `flash()` is called after
 * each successful change; calling it again while the toast is up simply extends it. The timer is
 * cleared on unmount.
 */
export function useSavedToast(duration = 2200) {
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const flash = useCallback(() => {
    clearTimeout(timer.current);
    setVisible(true);
    timer.current = setTimeout(() => setVisible(false), duration);
  }, [duration]);

  return { visible, flash };
}

const ENTER = { duration: 0.35, ease: EASE_OUT } as const;
const EXIT = { duration: 0.2, ease: EASE_IN } as const;

/**
 * Non-blocking confirmation, never a modal. The `role="status"` region is always mounted (a live
 * region that appears together with its text is often not announced) and holds the pill only while
 * it is visible. It floats above the mobile tab bar and ignores pointer events, so it can never
 * cover a control.
 */
export function SavedToast({ visible }: { visible: boolean }) {
  const { t } = useTranslation();

  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4 md:bottom-8"
    >
      <AnimatePresence>
        {visible ? (
          <m.p
            key="saved"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: ENTER }}
            exit={{ opacity: 0, y: 6, transition: EXIT }}
            className="inline-flex h-11 items-center gap-2.5 rounded-full bg-ink py-1 pl-1.5 pr-5 text-sm font-medium text-bg shadow-(--shadow-lift)"
          >
            <span aria-hidden="true" className="grid size-7 place-items-center rounded-full bg-accent-strong text-accent-ink">
              <Check className="size-4" strokeWidth={2.5} />
            </span>
            {t('settings.saved')}
          </m.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
