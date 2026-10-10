'use client';

import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

/** One shimmering block (`.skeleton` in globals.css). Decorative: always hidden from assistive tech. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={clsx('skeleton', className)} />;
}

interface CardSkeletonProps {
  /** Number of placeholder cards (default 1). */
  count?: number;
  /** Layout of the stack. Defaults to a single column with the feed's 20px gap. */
  className?: string;
}

/**
 * Placeholder for `count` content cards. It mirrors the real card's geometry class for class
 * (same container-query layout, padding, nested radius, image aspect and text rhythm), so swapping
 * in the content does not shift the page. The stack is announced once, as a polite status; the
 * shimmering blocks themselves are hidden.
 */
export function CardSkeleton({ count = 1, className }: CardSkeletonProps) {
  const { t } = useTranslation();
  const cards = Math.max(1, Math.floor(count));

  return (
    <div role="status" className={clsx('grid gap-5', className)}>
      <span className="sr-only">{t('card.loading')}</span>
      {Array.from({ length: cards }, (_, index) => (
        <div
          key={index}
          data-skeleton-card
          aria-hidden="true"
          className="@container rounded-card border border-line bg-surface p-2"
        >
          <div className="flex flex-col gap-3 @lg:flex-row @lg:gap-5">
            <Skeleton className="aspect-16/10 w-full rounded-[calc(var(--radius)-0.5rem)] @lg:aspect-auto @lg:min-h-44 @lg:w-48 @lg:shrink-0 @2xl:w-64 @4xl:w-72" />

            <div className="flex min-w-0 flex-1 flex-col gap-3 px-2 pb-2 @lg:py-2 @lg:pl-0 @lg:pr-3">
              <Skeleton className="h-6 w-24 rounded-full" />

              <div className="flex flex-col gap-1.5">
                {/* Title: two 26px lines. Description: two ~24px lines. */}
                <div className="flex h-13 flex-col justify-center gap-2.5">
                  <Skeleton className="h-4 w-[92%] rounded-md" />
                  <Skeleton className="h-4 w-[64%] rounded-md" />
                </div>
                <div className="flex h-12 flex-col justify-center gap-2">
                  <Skeleton className="h-3 w-full rounded-md" />
                  <Skeleton className="h-3 w-[78%] rounded-md" />
                </div>
              </div>

              <div className="mt-auto flex flex-col gap-3 pt-1 @md:flex-row @md:items-center @md:justify-between @lg:flex-col @lg:items-stretch @3xl:flex-row @3xl:items-center">
                <Skeleton className="h-3.5 w-40 rounded-md" />
                <div className="flex items-center gap-2">
                  <Skeleton className="size-11 shrink-0 rounded-full" />
                  <Skeleton className="h-11 flex-1 rounded-full @lg:w-32 @lg:flex-none" />
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
