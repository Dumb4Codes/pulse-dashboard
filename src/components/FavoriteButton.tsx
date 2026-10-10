'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { m } from 'framer-motion';
import { Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EASE_IN, EASE_OUT, SPRING_POP } from '@/lib/motion';
import type { ContentItem } from '@/lib/types';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectIsFavorite, toggleFavorite } from '@/store/slices/favorites';

interface FavoriteButtonProps {
  item: ContentItem;
  className?: string;
}

const INSTANT = { duration: 0 } as const;
// Opacity gets its own short tween: a spring on opacity would oscillate and flicker around 1.
const POP = { scale: SPRING_POP, opacity: { duration: 0.12, ease: EASE_OUT } } as const;
const EXIT = { duration: 0.15, ease: EASE_IN } as const;
const BURST = { duration: 0.55, ease: EASE_OUT } as const;

/**
 * Toggle button over `favorites` in the store (the whole item is saved as a snapshot, so a favourite
 * outlives the API feed). 44px target, `aria-pressed`, and a label that names the action.
 *
 * Motion: the filled heart is a second layer that springs in from nothing (a fill that grows from the
 * centre reads better than a colour cross-fade) with a single ring burst; un-favouriting is a quick
 * tween because a spring to 0 would overshoot into a mirrored heart. Nothing animates until the
 * user's first click, so favourites that arrive from localStorage on load simply appear. Reduced
 * motion is handled by the surrounding `MotionConfig reducedMotion="user"` (transforms are dropped,
 * the state change still lands).
 */
export function FavoriteButton({ item, className }: FavoriteButtonProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const selectFavorite = useMemo(() => selectIsFavorite(item.id), [item.id]);
  const favorite = useAppSelector(selectFavorite);
  const [interacted, setInteracted] = useState(false);

  const fillTransition = !interacted ? INSTANT : favorite ? POP : EXIT;

  return (
    <button
      type="button"
      aria-pressed={favorite}
      aria-label={favorite ? t('card.unfavorite') : t('card.favorite')}
      onClick={() => {
        setInteracted(true);
        dispatch(toggleFavorite(item));
      }}
      className={clsx(
        'relative grid size-11 shrink-0 place-items-center rounded-full border border-ink/25 bg-surface text-ink transition-[color,background-color,border-color,transform] duration-150 hover:border-ink/45 hover:bg-surface-2 active:scale-90',
        'aria-pressed:border-accent/60 aria-pressed:bg-accent/10',
        className,
      )}
    >
      <Heart
        aria-hidden="true"
        strokeWidth={1.75}
        className={clsx('size-5 transition-opacity duration-150', favorite && 'opacity-0')}
      />

      <m.span
        aria-hidden="true"
        initial={false}
        animate={{ scale: favorite ? 1 : 0, opacity: favorite ? 1 : 0 }}
        transition={fillTransition}
        className="absolute grid place-items-center text-accent"
      >
        <Heart strokeWidth={1.75} className="size-5 fill-current" />
      </m.span>

      {interacted && favorite && (
        <m.span
          aria-hidden="true"
          initial={{ scale: 0.55, opacity: 0.6 }}
          animate={{ scale: 1.7, opacity: 0 }}
          transition={BURST}
          className="pointer-events-none absolute inset-0.5 rounded-full border-2 border-accent"
        />
      )}
    </button>
  );
}
