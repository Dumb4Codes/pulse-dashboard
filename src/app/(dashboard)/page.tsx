"use client";

import { useCallback, useState, type ReactNode } from "react";
import { CheckCheck, Inbox, LoaderCircle, RotateCw, TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CategoryChips } from "@/components/CategoryChips";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { NewItemsPill } from "@/components/NewItemsPill";
import { PageHeader } from "@/components/PageHeader";
import { SortableFeed } from "@/components/SortableFeed";
import { CardSkeleton } from "@/components/Skeleton";
import { useFeed } from "@/hooks/useFeed";
import { useInfiniteSentinel } from "@/hooks/useInfiniteSentinel";
import { useLiveFeed } from "@/hooks/useLiveFeed";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { toggleCategory } from "@/store/slices/preferences";

/** Hands keyboard focus to the first card's grip (used when the new-items pill, which had focus, disappears). */
function focusFirstCard() {
  requestAnimationFrame(() => {
    document.querySelector<HTMLElement>("[data-feed-list] [data-handle-id]")?.focus({ preventScroll: true });
  });
}

/**
 * Home feed: quick category filter, the live "new items" pill, and the re-orderable list with
 * infinite scroll. All data logic is in `useFeed`; this page decides which of loading / blocking
 * error / empty / list to show, and what sits under the list (loading, a partial-failure notice,
 * or the end-of-feed message).
 */
export default function FeedPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const categories = useAppSelector((s) => s.preferences.categories);
  const feed = useFeed();
  useLiveFeed();

  const sentinelRef = useInfiniteSentinel(feed.loadMore, feed.canLoadMore);

  // The notice stays on screen (button locked, not unmounted) while its own retry is running, so a
  // keyboard user who pressed it keeps their place.
  const [retrying, setRetrying] = useState(false);
  const { retry } = feed;
  const retryFromNotice = useCallback(async () => {
    if (retrying) return;
    setRetrying(true);
    try {
      await retry();
    } finally {
      setRetrying(false);
    }
  }, [retry, retrying]);

  const hasItems = feed.items.length > 0;
  const showNotice = hasItems && (feed.hasPartialError || retrying);
  const showSpinner = feed.isFetchingMore && !showNotice;
  const showEnd = hasItems && !feed.hasMore && !showNotice && !showSpinner;

  let body: ReactNode;
  if (feed.isLoading) {
    body = <CardSkeleton count={4} />;
  } else if (feed.isError) {
    body = <ErrorState onRetry={feed.retry} />;
  } else if (!hasItems) {
    body = <EmptyState icon={Inbox} title={t("feed.empty.title")} body={t("feed.empty.body")} />;
  } else {
    body = (
      <>
        <SortableFeed items={feed.items} />

        {feed.hasMore ? <div ref={sentinelRef} aria-hidden="true" className="h-px" /> : null}

        <div className="mt-10 flex min-h-14 flex-col items-center gap-4 text-center">
          <div role="status" className="flex w-full justify-center">
            {showSpinner ? (
              <p className="inline-flex items-center gap-2.5 text-sm text-muted">
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" strokeWidth={2} />
                {t("feed.loadingMore")}
              </p>
            ) : null}
            {showNotice ? (
              <p className="inline-flex items-center gap-2.5 text-sm text-ink">
                <TriangleAlert aria-hidden="true" className="size-4 shrink-0 text-danger" strokeWidth={2} />
                {t("feed.partialError")}
              </p>
            ) : null}
            {showEnd ? (
              <p className="flex w-full max-w-sm animate-rise-sm items-center gap-4 text-muted">
                <span aria-hidden="true" className="h-px flex-1 bg-line" />
                <span className="inline-flex items-center gap-2 font-display text-base">
                  <CheckCheck aria-hidden="true" className="size-4 shrink-0 text-accent-strong" strokeWidth={2} />
                  {t("feed.endReached")}
                </span>
                <span aria-hidden="true" className="h-px flex-1 bg-line" />
              </p>
            ) : null}
          </div>

          {showNotice ? (
            <button
              type="button"
              onClick={() => void retryFromNotice()}
              aria-disabled={retrying || undefined}
              aria-busy={retrying || undefined}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-6 text-sm font-medium text-bg transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.98] aria-disabled:cursor-progress aria-disabled:opacity-70"
            >
              {retrying ? (
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" strokeWidth={2} />
              ) : (
                <RotateCw aria-hidden="true" className="size-4" strokeWidth={2} />
              )}
              {t("feed.retry")}
            </button>
          ) : null}
        </div>
      </>
    );
  }

  return (
    <div className="relative">
      <PageHeader title={t("feed.title")} subtitle={t("feed.subtitle")} />

      <div className="mb-10">
        <CategoryChips
          scrollable
          selected={categories}
          onToggle={(category) => dispatch(toggleCategory(category))}
          // Bleeds to the screen edge on phones; the right-hand fade hints that the row scrolls.
          className="max-sm:-mx-4 max-sm:px-4 max-sm:[mask-image:linear-gradient(to_right,black_calc(100%-1rem),transparent)]"
        />
        {/* Always mounted so the explanation is announced when it appears. */}
        <div role="status">
          {categories.length <= 1 ? (
            <p className="mt-3 text-sm text-muted">{t("settings.keepOneCategory")}</p>
          ) : null}
        </div>
      </div>

      <NewItemsPill onKeyboardFlush={focusFirstCard} />

      {body}
    </div>
  );
}
