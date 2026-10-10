'use client';

import { memo, useId } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { contentHref } from '@/lib/contentPath';
import { formatRelativeTime } from '@/lib/relativeTime';
import type { ContentItem } from '@/lib/types';
import { CardImage } from './CardImage';
import { CONTENT_TYPE_META } from './contentTypeMeta';
import { FavoriteButton } from './FavoriteButton';
import { Numeral } from './Numeral';
import { Skeleton } from './Skeleton';

/**
 * Trending bento board. Everything is laid out by the width of the board itself (container
 * queries), so it behaves the same beside a 264px sidebar, a 72px rail or no sidebar at all:
 *
 *   < 36rem   one column: hero, four tiles, then the list
 *   >= 36rem  two columns: the hero spans both, tiles in pairs
 *   >= 56rem  four columns, fixed 18rem rows: the hero takes 2x2 on the left, tiles 2x2 on the right
 *
 * Every tile opens the item's details page. Ranks 1-5 are photographs under a scrim (rank 1 is the hero); ranks 6-10 are compact rows with a
 * big outline numeral. The two groups are separate `<ol>`s (the second starts at 6), so the ranking
 * is real list semantics, not just a visual number.
 */

const BOARD_GRID =
  'grid grid-cols-1 gap-5 [grid-auto-flow:dense] @xl:grid-cols-2 @4xl:auto-rows-[18rem] @4xl:grid-cols-4';
const ROWS_GRID = 'grid grid-cols-1 gap-3 @4xl:grid-flow-col @4xl:grid-cols-2 @4xl:grid-rows-3';
const HERO_SIZE = 'h-[26rem] @xl:col-span-2 @xl:h-[24rem] @4xl:row-span-2 @4xl:h-auto';
/** A lone hero has nothing to sit beside, so it keeps one column (a column span would invent a second). */
const SOLO_HERO_SIZE = 'h-[26rem] @xl:h-[24rem] @4xl:row-span-2 @4xl:h-auto';
const TILE_SIZE = 'h-72 @4xl:h-auto';

/**
 * Text and shade on a photograph must stay legible whatever the photo is, so a tile always sits on
 * a *dark* scrim: page ink in light mode (ink is near-black), page background in dark mode
 * (background is near-black). `--on-scrim` is the matching light text colour.
 */
const SCRIM_SCOPE =
  '[--scrim:var(--ink)] [--on-scrim:var(--bg)] dark:[--scrim:var(--bg)] dark:[--on-scrim:var(--ink)]';
/**
 * Two shades. The one at the top is a short veil behind the (decorative) rank numeral, sized in rem
 * so it hugs the numeral instead of scaling with the tile.
 *
 * The one behind the text is the *background of the text block itself* (`SCRIM_TEXT`), not a layer
 * measured from the tile's bottom edge: a fixed-height shade ended below the first lines of the hero
 * title and the category label whenever the text wrapped or the tile was tall, and cream text on a
 * bright sky failed AA (1.3:1). Tied to the block, the shade is >= 80% wherever there is text, so
 * the text clears AA even over a white photograph; it then fades out over the 3rem above the block
 * (`-mt-12 pt-12`: the fade zone overlaps the tile's free space, it does not add height).
 */
const SCRIM_TOP =
  'bg-[linear-gradient(to_bottom,color-mix(in_oklab,var(--scrim)_62%,transparent)_0%,transparent_6rem)]';
const SCRIM_TOP_HERO =
  'bg-[linear-gradient(to_bottom,color-mix(in_oklab,var(--scrim)_62%,transparent)_0%,transparent_9rem)]';
const SCRIM_TEXT =
  '-mx-4 -mb-4 -mt-12 px-4 pb-4 pt-12 @xl:-mx-5 @xl:-mb-5 @xl:px-5 @xl:pb-5 bg-[linear-gradient(to_top,color-mix(in_oklab,var(--scrim)_92%,transparent)_0%,color-mix(in_oklab,var(--scrim)_80%,transparent)_calc(100%-3rem),transparent_100%)]';
/** A ring around the whole tile when its (stretched) link has keyboard focus. */
const TILE_FOCUS =
  'has-[a:focus-visible]:outline-3 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-(--ring)';
const CATEGORY_LABEL =
  'text-xs font-medium uppercase leading-none tracking-[0.08em] [:lang(hi)_&]:leading-normal [:lang(hi)_&]:tracking-normal';

/** Staggered entrance (CSS, so it runs without JS and collapses under reduced motion). */
const enterDelay = (rank: number) => ({ animationDelay: `${Math.min(rank - 1, 9) * 55}ms` });

interface TileProps {
  item: ContentItem;
  /** 1-based position in the ranking. */
  rank: number;
}

interface TrendingTileProps extends TileProps {
  /** The hero is the only tile on the board. */
  solo?: boolean;
}

/** Rank 1 uses `hero`; ranks 2-5 use `tile`. Same anatomy, different scale. */
function TrendingTileImpl({ item, rank, solo = false }: TrendingTileProps) {
  const { t, i18n } = useTranslation();
  const titleId = useId();
  const hero = rank === 1;
  const meta = CONTENT_TYPE_META[item.type];
  const TypeIcon = meta.icon;
  const published = formatRelativeTime(item.publishedAt, i18n.resolvedLanguage ?? i18n.language);

  return (
    <li className={clsx('min-w-0 animate-rise-sm', hero ? (solo ? SOLO_HERO_SIZE : HERO_SIZE) : TILE_SIZE)} style={enterDelay(rank)}>
      <article
        aria-labelledby={titleId}
        data-rank={rank}
        data-variant={hero ? 'hero' : 'tile'}
        data-type={item.type}
        className={clsx(
          'group relative isolate h-full overflow-hidden rounded-card border border-line bg-surface-2',
          'shadow-[0_1px_0_color-mix(in_oklab,var(--ink)_6%,transparent)] transition-shadow duration-300 hover:shadow-(--shadow)',
          meta.tone,
          SCRIM_SCOPE,
          TILE_FOCUS,
        )}
      >
        <div className="absolute inset-0">
          <CardImage src={item.image} type={item.type} className="size-full" />
        </div>
        <div aria-hidden="true" className={clsx('pointer-events-none absolute inset-0', hero ? SCRIM_TOP_HERO : SCRIM_TOP)} />

        {/* Absolute and full-bleed on purpose: the stretched link's ::after then covers the whole tile. */}
        <div className="absolute inset-0 flex flex-col justify-between p-4 text-(color:--on-scrim) @xl:p-5">
          <div className="flex items-start justify-between gap-3">
            <Numeral tone="scrim" className={hero ? 'text-[5.5rem] @xl:text-[7rem]' : 'text-6xl @4xl:text-[3.5rem]'}>
              {rank}
            </Numeral>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface/90 py-1 pl-1 pr-3 text-xs font-medium text-ink shadow-[0_1px_2px_color-mix(in_oklab,var(--ink)_22%,transparent)] backdrop-blur-sm">
              <span className="grid size-6 place-items-center rounded-full bg-(--tone) text-accent-ink">
                <TypeIcon aria-hidden="true" className="size-3.5" strokeWidth={2} />
              </span>
              {t(meta.labelKey)}
            </span>
          </div>

          {/* Not positioned, on purpose: the title link's ::after must keep resolving against the full-bleed layer above. */}
          <div className={clsx('flex min-w-0 flex-col gap-2.5', SCRIM_TEXT)}>
            <span className={clsx(CATEGORY_LABEL, 'opacity-90')}>{t(`category.${item.category}`)}</span>
            <h3
              id={titleId}
              className={clsx(
                'line-clamp-3 text-balance font-display font-medium tracking-[-0.015em] wrap-anywhere [:lang(hi)_&]:leading-normal',
                hero
                  ? 'text-2xl/[1.2] @xl:text-3xl/[1.15] @4xl:text-4xl/[1.1]'
                  : 'text-lg/[1.3] @sm:text-xl/[1.3] @xl:text-lg/[1.3]',
              )}
            >
              <Link href={contentHref(item.id)} prefetch={false} className="after:absolute after:inset-0 focus-visible:outline-none">
                {item.title}
              </Link>
            </h3>
            {hero && item.description ? (
              <p className="line-clamp-2 hidden max-w-[56ch] text-pretty text-base leading-relaxed opacity-90 wrap-anywhere @xl:block">
                {item.description}
              </p>
            ) : null}

            <div className="mt-1 flex items-center justify-between gap-3">
              {/* Hero: one line. Tiles are narrow, so source and age stack and the source keeps its full name. */}
              <p
                className={clsx(
                  'flex min-w-0 text-[0.8125rem] opacity-90',
                  hero ? 'items-center gap-1.5' : 'flex-col items-start gap-0.5 @4xl:gap-0',
                )}
              >
                <span className="max-w-full truncate">{item.source}</span>
                {published ? (
                  <>
                    {hero ? <span aria-hidden="true">·</span> : null}
                    <time dateTime={item.publishedAt} suppressHydrationWarning className="shrink-0 whitespace-nowrap">
                      {published}
                    </time>
                  </>
                ) : null}
              </p>
              {/* Above the stretched link, so the heart stays a separate click target. */}
              <FavoriteButton item={item} className="relative z-10" />
            </div>
          </div>
        </div>
      </article>
    </li>
  );
}

export const TrendingTile = memo(TrendingTileImpl);

/** Ranks 6-10: a quiet row with the big outline numeral doing the talking. */
function TrendingRowImpl({ item, rank }: TileProps) {
  const { i18n } = useTranslation();
  const titleId = useId();
  const meta = CONTENT_TYPE_META[item.type];
  const published = formatRelativeTime(item.publishedAt, i18n.resolvedLanguage ?? i18n.language);

  return (
    <li className="min-w-0 animate-rise-sm" style={enterDelay(rank)}>
      <article
        aria-labelledby={titleId}
        data-rank={rank}
        data-variant="row"
        data-type={item.type}
        className={clsx(
          'group relative flex h-full items-center gap-3 rounded-card border border-line bg-surface p-3 @sm:gap-4',
          'shadow-[0_1px_0_color-mix(in_oklab,var(--ink)_6%,transparent)] transition-shadow duration-300 hover:shadow-(--shadow)',
          meta.tone,
          TILE_FOCUS,
        )}
      >
        <Numeral className="w-[2ch] shrink-0 text-center text-5xl @sm:text-6xl">{rank}</Numeral>

        {/* Nested radius: card 18px - padding 12px = 6px. */}
        <CardImage
          src={item.image}
          type={item.type}
          className="hidden size-16 shrink-0 rounded-md @sm:block"
        />

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3
            id={titleId}
            className="line-clamp-2 text-balance font-display text-base/[1.3] font-medium tracking-[-0.01em] wrap-anywhere @sm:text-lg/[1.3] [:lang(hi)_&]:leading-normal"
          >
            <Link href={contentHref(item.id)} prefetch={false} className="after:absolute after:inset-0 focus-visible:outline-none">
              {item.title}
            </Link>
          </h3>
          <p className="flex min-w-0 items-center gap-1.5 text-[0.8125rem] text-muted">
            <span className="truncate">{item.source}</span>
            {published ? (
              <>
                <span aria-hidden="true">·</span>
                <time dateTime={item.publishedAt} suppressHydrationWarning className="shrink-0 whitespace-nowrap">
                  {published}
                </time>
              </>
            ) : null}
          </p>
        </div>

        <FavoriteButton item={item} className="relative z-10" />
      </article>
    </li>
  );
}

export const TrendingRow = memo(TrendingRowImpl);

interface TrendingBoardProps {
  /** Already ranked, highest first (see `useTrending`). Up to ten. */
  items: ContentItem[];
}

/** The ranked board: ranks 1-5 as a bento, 6-10 as a two-column list underneath. */
export function TrendingBoard({ items }: TrendingBoardProps) {
  const { t } = useTranslation();
  const top = items.slice(0, 5);
  const rest = items.slice(5);

  return (
    <div className="@container">
      <ol role="list" className={clsx(BOARD_GRID, top.length === 1 && '@xl:grid-cols-1 @4xl:grid-cols-1')}>
        {top.map((item, i) => (
          <TrendingTile key={item.id} item={item} rank={i + 1} solo={top.length === 1} />
        ))}
      </ol>

      {rest.length > 0 ? (
        <div className="mt-10">
          <div aria-hidden="true" className="mb-4 flex items-center gap-4">
            <span className="font-display text-xl font-medium tracking-[-0.01em] [:lang(hi)_&]:leading-normal">
              {t('trending.more')}
            </span>
            <span className="h-px flex-1 bg-line" />
          </div>
          <ol role="list" start={6} aria-label={t('trending.more')} className={ROWS_GRID}>
            {rest.map((item, i) => (
              <TrendingRow key={item.id} item={item} rank={i + 6} />
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Placeholder with the board's exact geometry (same grid, heights, radii), so the real board
 * replaces it without shifting the page. Announced once as a polite status; the blocks are hidden.
 */
export function TrendingSkeleton() {
  const { t } = useTranslation();
  const tiles = [HERO_SIZE, TILE_SIZE, TILE_SIZE, TILE_SIZE, TILE_SIZE];

  return (
    <div role="status" className="@container">
      <span className="sr-only">{t('card.loading')}</span>
      <div aria-hidden="true">
        <div className={BOARD_GRID}>
          {tiles.map((size, i) => (
            <div key={i} data-skeleton-tile className={clsx('min-w-0', size)}>
              <Skeleton className="size-full rounded-card" />
            </div>
          ))}
        </div>
        <div className="mt-10">
          <Skeleton className="mb-4 h-7 w-36 rounded-md" />
          <div className={ROWS_GRID}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} data-skeleton-tile className="h-[5.5rem] min-w-0">
                <Skeleton className="size-full rounded-card" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
