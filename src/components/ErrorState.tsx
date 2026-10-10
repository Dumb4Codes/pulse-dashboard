'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { LoaderCircle, RotateCw, TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ErrorStateProps {
  /**
   * Retry handler. May return a promise (e.g. an RTK Query `refetch()`): the button then stays
   * locked, and shows a spinner, until it settles. A rejection is swallowed here, because the
   * caller's own state (not this panel) is what reports a second failure.
   */
  onRetry: () => void | Promise<unknown>;
  /** Defaults to the feed copy (`feed.error.title`). */
  title?: string;
  /** Defaults to the feed copy (`feed.error.body`). */
  body?: string;
  className?: string;
}

/**
 * Blocking-failure panel with a retry. `role="alert"`, so it is announced as soon as it appears.
 * The retry button uses `aria-disabled` while pending rather than `disabled`, so a keyboard user who
 * pressed it does not lose focus mid-request.
 */
export function ErrorState({ onRetry, title, body, className }: ErrorStateProps) {
  const { t } = useTranslation();
  const [pending, setPending] = useState(false);

  async function retry() {
    if (pending) return;
    setPending(true);
    try {
      await onRetry();
    } catch {
      // See `onRetry` above.
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      role="alert"
      className={clsx(
        'mx-auto flex max-w-lg animate-rise-sm flex-col items-center rounded-card border border-danger/30 bg-danger/5 px-6 py-10 text-center sm:px-10',
        className,
      )}
    >
      <span aria-hidden="true" className="mb-5 grid size-14 place-items-center rounded-full bg-danger/10 text-danger">
        <TriangleAlert className="size-7" strokeWidth={1.5} />
      </span>
      <h2 className="font-display text-2xl/[1.2] font-medium tracking-[-0.02em] text-balance">
        {title ?? t('feed.error.title')}
      </h2>
      <p className="mt-2.5 max-w-[44ch] text-pretty text-base leading-relaxed text-muted">
        {body ?? t('feed.error.body')}
      </p>
      <button
        type="button"
        onClick={() => void retry()}
        aria-disabled={pending || undefined}
        aria-busy={pending || undefined}
        className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-6 text-sm font-medium text-bg transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.98] aria-disabled:cursor-progress aria-disabled:opacity-70"
      >
        {pending ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" strokeWidth={2} />
        ) : (
          <RotateCw aria-hidden="true" className="size-4" strokeWidth={2} />
        )}
        {t('feed.retry')}
      </button>
    </div>
  );
}
