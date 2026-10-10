'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { m } from 'framer-motion';
import { Check, Link2, TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SPRING_POP } from '@/lib/motion';

type CopyState = 'idle' | 'copied' | 'failed';

/**
 * Copies this page's address. The button's label does the confirming (it swaps for two seconds, with
 * a springy icon like the favorite heart), and a separate always-mounted `role="status"` region says
 * the same thing to a screen reader. A blocked clipboard (insecure origin, denied permission) reads
 * as "Couldn't copy the link" instead of failing silently.
 */
export function CopyLinkButton() {
  const { t } = useTranslation();
  const [state, setState] = useState<CopyState>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(async () => {
    let next: CopyState = 'copied';
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      next = 'failed';
    }
    clearTimeout(timer.current);
    setState(next);
    timer.current = setTimeout(() => setState('idle'), 2200);
  }, []);

  const Icon = state === 'copied' ? Check : state === 'failed' ? TriangleAlert : Link2;
  const label =
    state === 'copied' ? t('detail.linkCopied') : state === 'failed' ? t('detail.copyFailed') : t('detail.copyLink');

  return (
    <>
      <button
        type="button"
        onClick={() => void copy()}
        className="inline-flex h-12 min-w-44 items-center justify-center gap-2 rounded-full border border-ink/25 bg-surface px-5 text-sm font-medium transition-[background-color,border-color,transform] duration-150 hover:border-ink/45 hover:bg-surface-2 active:scale-[0.97]"
      >
        <m.span
          key={state}
          aria-hidden="true"
          initial={state === 'idle' ? false : { scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={SPRING_POP}
          className={state === 'idle' ? 'inline-grid' : 'inline-grid text-accent-strong'}
        >
          <Icon className="size-4" strokeWidth={2} />
        </m.span>
        {label}
      </button>
      <span role="status" className="sr-only">
        {state === 'idle' ? '' : label}
      </span>
    </>
  );
}
