'use client';

import type { MouseEvent } from 'react';
import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DURATION, EASE_IN, EASE_OUT, SPRING_SNAPPY } from '@/lib/motion';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectPendingForCategories } from '@/store/selectors';
import { flushLive } from '@/store/slices/live';

interface NewItemsPillProps {
  /**
   * Called after a keyboard activation (not a pointer click), once the items are in the feed. The
   * pill unmounts when pressed, so without this the reader's focus would drop back to the top of the
   * document; the page uses it to hand focus to the first card.
   */
  onKeyboardFlush?: () => void;
}

// Position springs; opacity gets its own tween because a spring on opacity oscillates around 1.
const ENTER = {
  y: SPRING_SNAPPY,
  scale: SPRING_SNAPPY,
  opacity: { duration: DURATION.micro, ease: EASE_OUT },
} as const;
const EXIT = { duration: DURATION.exit * 0.7, ease: EASE_IN } as const;
const FADE = { duration: DURATION.micro } as const;

const MOVING = {
  initial: { opacity: 0, y: -20, scale: 0.9 },
  animate: { opacity: 1, y: 0, scale: 1, transition: ENTER },
  exit: { opacity: 0, y: -12, scale: 0.95, transition: EXIT },
} as const;
const STILL = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: FADE },
  exit: { opacity: 0, transition: FADE },
} as const;

/**
 * Floating "N new items" button. Items pushed over SSE wait in `live.pending`; nothing moves under
 * the reader until they press this, which injects them at the top (`flushLive`) and scrolls there.
 *
 * The `role="status"` region is always mounted and only its content comes and goes, which is what
 * makes assistive tech announce the arrival ("3 new items"). It is a zero-height sticky strip just
 * under the app bar, so the pill follows the reader down the feed without taking any layout space,
 * and `pointer-events-none` keeps the strip itself from blocking clicks on the cards beneath it.
 *
 * Its resting spot straddles the seam between the filters and the first card: the `-mt-7.5`/`mb-7.5`
 * pair pulls the strip up 30px without moving anything else, so only the bottom 14px of the pill dips
 * into the card's top padding (above the category tag and the drag grip). It then sticks under the app bar.
 *
 * It enters from above (where the new items will appear) with a springy drop and leaves faster than
 * it came. Reduced motion keeps only the short opacity fade and a jump-scroll.
 */
export function NewItemsPill({ onKeyboardFlush }: NewItemsPillProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const count = useAppSelector((s) => selectPendingForCategories(s).length);
  const reduceMotion = useReducedMotion();

  function flush(event: MouseEvent<HTMLButtonElement>) {
    // `detail` is 0 for keyboard-triggered clicks (Enter / Space).
    const viaKeyboard = event.detail === 0;
    dispatch(flushLive());
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    if (viaKeyboard) onKeyboardFlush?.();
  }

  return (
    <div role="status" className="pointer-events-none sticky top-[4.75rem] z-10 -mt-7.5 mb-7.5 flex h-0 justify-center">
      <AnimatePresence>
        {count > 0 ? (
          <m.button
            key="pill"
            type="button"
            onClick={flush}
            {...(reduceMotion ? STILL : MOVING)}
            className="pointer-events-auto inline-flex h-11 items-center gap-2.5 rounded-full bg-ink py-0 pl-1.5 pr-5 text-sm font-medium text-bg shadow-(--shadow) transition-colors hover:bg-ink/90 active:scale-[0.98]"
          >
            <span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-accent-strong text-accent-ink">
              <ArrowUp className="size-4" strokeWidth={2.25} />
            </span>
            <span className="tabular-nums">{t('feed.newItems', { count })}</span>
          </m.button>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
