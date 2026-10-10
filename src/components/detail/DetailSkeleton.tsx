'use client';

import { useTranslation } from 'react-i18next';
import { Skeleton } from '../Skeleton';

/**
 * Placeholder with the details page's geometry (back button, hero photo, title, body, side panel), so
 * the real page replaces it without shifting. Announced once as a polite status; the blocks are hidden.
 */
export function DetailSkeleton() {
  const { t } = useTranslation();

  return (
    <div role="status" className="@container">
      <span className="sr-only">{t('card.loading')}</span>
      <div aria-hidden="true">
        <Skeleton className="mb-6 h-11 w-28 rounded-full" />
        <Skeleton className="aspect-16/10 w-full rounded-card @3xl:aspect-auto @3xl:h-72 @4xl:h-80" />

        <div className="mt-8 grid gap-10 @4xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div>
            <Skeleton className="h-7 w-32 rounded-full" />
            <div className="mt-5 flex flex-col gap-3">
              <Skeleton className="h-9 w-[88%] rounded-md" />
              <Skeleton className="h-9 w-[60%] rounded-md" />
            </div>
            <div className="mt-6 flex max-w-[62ch] flex-col gap-3">
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-[72%] rounded-md" />
            </div>
            <div className="mt-8 flex gap-3">
              <Skeleton className="size-12 rounded-full" />
              <Skeleton className="h-12 w-40 rounded-full" />
              <Skeleton className="h-12 w-44 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-80 w-full rounded-card" />
        </div>
      </div>
    </div>
  );
}
