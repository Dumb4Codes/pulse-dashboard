'use client';

import { memo, useId, type ReactNode } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { m, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, GripVertical, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { contentHref } from '@/lib/contentPath';
import { SPRING_LIFT } from '@/lib/motion';
import { formatRelativeTime } from '@/lib/relativeTime';
import { safeHttpUrl } from '@/lib/safeUrl';
import type { ContentItem } from '@/lib/types';
import { CardImage } from './CardImage';
import { CONTENT_TYPE_META } from './contentTypeMeta';
import { FavoriteButton } from './FavoriteButton';

export interface ContentCardProps {
  item: ContentItem;
  /**
   * Shows the built-in, purely visual grip in the handle slot. For an operable handle (pointer and
   * keyboard reordering) pass your own through `handle`.
   */
  draggable?: boolean;
  /**
   * Rendered in the handle slot (top-right of the text column), in place of the built-in grip. The
   * card never owns drag state itself: the list wires the handle to its own drag controls.
   */
  handle?: ReactNode;
  className?: string;
}

/**
 * Editorial content card, laid out by its own width (container queries), so it behaves the same in
 * a single-column feed, a two-column grid or a bento cell:
 *
 *   < 32rem   image on top (16:10), text below; the footer stacks when narrower than 28rem
 *   >= 32rem  image left, text right; the footer only goes in-line once there is room (>= 48rem)
 *
 * Nested radii: the card is 18px with 8px padding, so the inset image is 10px.
 * Interaction: hover lifts the card (spring) and grows its shadow, and the image zooms 4% (CSS, via
 * the `group`). The whole card opens its details page: the headline is the one real link and its
 * `::after` stretches over the card, while the grip, the heart and the call-to-action sit above it
 * (`relative z-10`) as separate targets. Only plain http(s) URLs are ever linked out or loaded;
 * everything else renders as text.
 */
function ContentCardImpl({ item, draggable = false, handle, className }: ContentCardProps) {
  const { t, i18n } = useTranslation();
  const titleId = useId();
  const hintId = useId();
  // MotionConfig's "user" mode skips the tween but still applies the end state; a lift that merely
  // jumps is worse than none, so reduced motion opts out of the hover lift altogether.
  const reduceMotion = useReducedMotion();
  const meta = CONTENT_TYPE_META[item.type];
  const TypeIcon = meta.icon;
  const href = safeHttpUrl(item.url);
  const published = formatRelativeTime(item.publishedAt, i18n.resolvedLanguage ?? i18n.language);

  const handleSlot =
    handle ??
    (draggable ? (
      <span
        role="img"
        aria-label={t('card.drag')}
        className="grid size-8 cursor-grab touch-none place-items-center rounded-lg text-muted transition-colors hover:text-ink"
      >
        <GripVertical aria-hidden="true" className="size-5" strokeWidth={1.75} />
      </span>
    ) : null);

  return (
    <m.article
      aria-labelledby={titleId}
      data-type={item.type}
      whileHover={reduceMotion ? undefined : { y: -4 }}
      transition={SPRING_LIFT}
      className={clsx(
        'group @container relative rounded-card border border-line bg-surface p-2',
        'shadow-[0_1px_0_color-mix(in_oklab,var(--ink)_6%,transparent)] transition-shadow duration-300 hover:shadow-(--shadow)',
        // The stretched link has the focus, so the ring goes around the whole card.
        'has-[a[data-card-link]:focus-visible]:outline-3 has-[a[data-card-link]:focus-visible]:outline-offset-2 has-[a[data-card-link]:focus-visible]:outline-(--ring)',
        className,
      )}
    >
      {/* h-full: in a stretched grid row the image and footer follow the card instead of leaving a gap. */}
      <div className="flex h-full flex-col gap-3 @lg:flex-row @lg:gap-5">
        <CardImage
          src={item.image}
          type={item.type}
          className="aspect-16/10 w-full rounded-[calc(var(--radius)-0.5rem)] @lg:aspect-auto @lg:min-h-44 @lg:w-48 @lg:shrink-0 @2xl:w-64 @4xl:w-72"
        >
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full bg-surface/90 py-1 pl-1 pr-3 text-xs font-medium text-ink shadow-[0_1px_2px_color-mix(in_oklab,var(--ink)_22%,transparent)] backdrop-blur-sm">
            <span className="grid size-6 place-items-center rounded-full bg-(--tone) text-accent-ink">
              <TypeIcon aria-hidden="true" className="size-3.5" strokeWidth={2} />
            </span>
            {t(meta.labelKey)}
          </span>

          {item.type === 'movie' && (
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-items-center">
              <span className="grid size-12 place-items-center rounded-full bg-surface/85 text-ink shadow-[0_2px_8px_color-mix(in_oklab,var(--ink)_25%,transparent)] backdrop-blur-sm transition-transform duration-300 ease-out-expo group-hover:scale-110">
                <Play className="size-5 translate-x-px fill-current" strokeWidth={1.75} />
              </span>
            </span>
          )}
        </CardImage>

        <div className="flex min-w-0 flex-1 flex-col gap-3 px-2 pb-2 @lg:py-2 @lg:pl-0 @lg:pr-3">
          <div className="flex items-center justify-between gap-3">
            {/* Letter-spacing and tight leading suit Latin capitals but break up Devanagari conjuncts and clip its headline bar. */}
            <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium uppercase leading-none tracking-[0.08em] text-muted [:lang(hi)_&]:py-0.5 [:lang(hi)_&]:leading-normal [:lang(hi)_&]:tracking-normal">
              {t(`category.${item.category}`)}
            </span>
            {handleSlot ? <div className="relative z-10 -my-2.5 -mr-1.5 shrink-0">{handleSlot}</div> : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <h2
              id={titleId}
              className="line-clamp-2 max-w-[60ch] text-balance font-display text-xl/[1.3] font-medium tracking-[-0.01em] wrap-anywhere [:lang(hi)_&]:leading-normal"
            >
              <Link
                href={contentHref(item.id)}
                // A feed holds dozens of cards; prefetching a route for each one as it scrolls past is wasted work.
                prefetch={false}
                data-card-link=""
                className="decoration-ink/40 decoration-1 underline-offset-[5px] outline-none after:absolute after:inset-0 after:rounded-card after:content-[''] group-hover:underline"
              >
                {item.title}
              </Link>
            </h2>
            {item.description ? (
              <p className="line-clamp-2 max-w-[60ch] text-pretty text-[0.9375rem] leading-relaxed text-muted wrap-anywhere [:lang(hi)_&]:leading-[1.7]">
                {item.description}
              </p>
            ) : null}
          </div>

          <div className="mt-auto flex flex-col gap-3 pt-1 @md:flex-row @md:items-center @md:justify-between @lg:flex-col @lg:items-stretch @3xl:flex-row @3xl:items-center">
            <p className="flex min-w-0 items-center gap-1.5 text-[0.8125rem] text-muted">
              <span className="truncate">{item.source}</span>
              {published ? (
                <>
                  <span aria-hidden="true">·</span>
                  {/* Relative text depends on the clock and the language, so it may differ from any server render. */}
                  <time dateTime={item.publishedAt} suppressHydrationWarning className="shrink-0 whitespace-nowrap">
                    {published}
                  </time>
                </>
              ) : null}
            </p>

            <div className="flex items-center gap-2">
              <FavoriteButton item={item} className="z-10" />
              {href ? (
                <>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-describedby={`${titleId} ${hintId}`}
                    className="group/cta relative z-10 inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-accent-strong px-5 text-sm font-medium text-accent-ink transition-[background-color,color,transform] duration-200 hover:bg-ink hover:text-bg active:scale-[0.98] @lg:flex-none"
                  >
                    {t(meta.ctaKey)}
                    <ArrowUpRight
                      aria-hidden="true"
                      className="size-4 transition-transform duration-200 ease-out-expo group-hover/cta:-translate-y-0.5 group-hover/cta:translate-x-0.5"
                      strokeWidth={2}
                    />
                  </a>
                  <span id={hintId} hidden>
                    {t('card.newTab')}
                  </span>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </m.article>
  );
}

/** Memoised: a long feed re-renders on every live/paging update, and most cards are unchanged. */
export const ContentCard = memo(ContentCardImpl);
