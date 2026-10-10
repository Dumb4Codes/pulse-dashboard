'use client';

import { useId, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { ArrowLeft, ArrowUpRight, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/lib/formatDate';
import { formatRelativeTime } from '@/lib/relativeTime';
import { safeHttpUrl } from '@/lib/safeUrl';
import type { ContentItem } from '@/lib/types';
import { whyShown } from '@/lib/whyShown';
import { useAppSelector } from '@/store/hooks';
import { CardImage } from '../CardImage';
import { ContentCard } from '../ContentCard';
import { CONTENT_TYPE_META } from '../contentTypeMeta';
import { FavoriteButton } from '../FavoriteButton';
import { CopyLinkButton } from './CopyLinkButton';
import { ScoreRing } from './ScoreRing';

/** Staggered CSS entrance (runs without JS, collapses under reduced motion), same idiom as the other pages. */
const enter = (step: number) => ({ animationDelay: `${step * 70}ms` });

/**
 * Goes back to wherever the reader came from (the feed, Trending, Favorites, a search). With no
 * earlier entry in this tab (a bookmark, a shared link) there is nothing to go back to, so it
 * goes to the feed instead of leaving the app.
 */
function BackButton() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? router.back() : router.push('/'))}
      className="group -ml-1 inline-flex h-11 items-center gap-2.5 rounded-full pr-4 text-sm font-medium text-muted transition-colors hover:text-ink"
    >
      <span className="grid size-9 place-items-center rounded-full border border-ink/25 bg-surface text-ink transition-colors group-hover:border-ink/45 group-hover:bg-surface-2">
        <ArrowLeft
          aria-hidden="true"
          className="size-4 transition-transform duration-200 ease-out-expo group-hover:-translate-x-0.5"
          strokeWidth={2}
        />
      </span>
      {t('detail.back')}
    </button>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-t border-line py-3 text-sm first:border-t-0">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 text-right font-medium wrap-anywhere">{children}</dd>
    </div>
  );
}

interface ItemDetailProps {
  item: ContentItem;
  /** Other items in the same category, already limited and de-duplicated by `useContentItem`. */
  related: ContentItem[];
}

/**
 * The details page for one card, in the dashboard's own language: Fraunces headline that rises
 * through a mask, the card's photograph settling into place, a type-coloured score ring that draws
 * itself, the same pills, heart and call-to-action as the cards, and related cards that are the real
 * `ContentCard`. It only states what the item itself carries (APIs return a teaser, not the full
 * text), so the page's job is context and the way out to the original: the type's own call to action
 * (Read more / Play now / View post) opens it in a new tab.
 *
 * Layout is by the width of the content area (container queries), like the cards and the Trending
 * board: one column, then the side panel beside the text from 56rem.
 */
export function ItemDetail({ item, related }: ItemDetailProps) {
  const { t, i18n } = useTranslation();
  const titleId = useId();
  const hintId = useId();
  const language = i18n.resolvedLanguage ?? i18n.language;
  const categories = useAppSelector((s) => s.preferences.categories);
  const hashtags = useAppSelector((s) => s.preferences.hashtags);

  const meta = CONTENT_TYPE_META[item.type];
  const TypeIcon = meta.icon;
  const href = safeHttpUrl(item.url);
  const host = href ? new URL(href).hostname.replace(/^www\./, '') : '';
  const relative = formatRelativeTime(item.publishedAt, language);
  const date = formatDate(item.publishedAt, language);
  const isPost = item.type === 'social';
  const category = t(`category.${item.category}`);
  const why = whyShown(item, categories, hashtags);

  const heading = isPost && item.author ? item.author : item.title;

  return (
    <div className={clsx('@container', meta.tone)}>
      <div className="mb-5 animate-rise-sm">
        <BackButton />
      </div>

      <article aria-labelledby={titleId}>
        <div className="animate-rise-sm" style={enter(1)}>
          <CardImage
            src={item.image}
            type={item.type}
            className="aspect-16/10 w-full rounded-card border border-line @3xl:aspect-auto @3xl:h-72 @4xl:h-80 [&_img]:animate-settle"
          >
            <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-surface/90 py-1 pl-1 pr-3 text-xs font-medium text-ink shadow-[0_1px_2px_color-mix(in_oklab,var(--ink)_22%,transparent)] backdrop-blur-sm">
              <span className="grid size-6 place-items-center rounded-full bg-(--tone) text-accent-ink">
                <TypeIcon aria-hidden="true" className="size-3.5" strokeWidth={2} />
              </span>
              {t(meta.labelKey)}
            </span>
          </CardImage>
        </div>

        <div className="mt-8 grid gap-10 @4xl:grid-cols-[minmax(0,1fr)_20rem] @4xl:gap-14">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 animate-rise-sm" style={enter(2)}>
              <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium uppercase leading-none tracking-[0.08em] text-muted [:lang(hi)_&]:py-0.5 [:lang(hi)_&]:leading-normal [:lang(hi)_&]:tracking-normal">
                {category}
              </span>
              <p className="flex min-w-0 items-center gap-1.5 text-[0.8125rem] text-muted">
                <span className="truncate">{item.source}</span>
                {relative ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <time dateTime={item.publishedAt} className="shrink-0 whitespace-nowrap">
                      {relative}
                    </time>
                  </>
                ) : null}
              </p>
            </div>

            {/* The overflow mask lets the headline rise into view; the negative margin gives the descenders back. */}
            <h1
              id={titleId}
              className="-mb-[0.12em] mt-4 block overflow-hidden pb-[0.12em] font-display text-[clamp(2rem,4.2vw,3.25rem)] font-medium leading-[1.08] tracking-[-0.025em] text-balance wrap-anywhere [:lang(hi)_&]:leading-[1.3]"
            >
              <span className="block animate-mask-up [animation-delay:120ms]">{heading}</span>
            </h1>
            {isPost && item.author ? (
              <p className="mt-3 animate-rise-sm text-base text-muted" style={enter(3)}>
                {item.title}
              </p>
            ) : null}

            {item.description ? (
              <div className="mt-6 animate-rise-sm" style={enter(3)}>
                {isPost ? (
                  <blockquote className="max-w-[44ch] border-l-2 border-(--tone) pl-5 font-display text-2xl/[1.45] text-pretty wrap-anywhere [:lang(hi)_&]:leading-[1.7]">
                    {item.description}
                  </blockquote>
                ) : (
                  <p className="max-w-[62ch] text-pretty text-lg leading-relaxed text-ink/85 wrap-anywhere [:lang(hi)_&]:leading-[1.8]">
                    {item.description}
                  </p>
                )}
              </div>
            ) : null}

            <div className="mt-8 flex flex-wrap items-center gap-3 animate-rise-sm" style={enter(4)}>
              <FavoriteButton item={item} className="size-12" />
              {href ? (
                <>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-describedby={hintId}
                    className="group/cta inline-flex h-12 items-center justify-center gap-1.5 rounded-full bg-accent-strong px-6 text-sm font-medium text-accent-ink transition-[background-color,color,transform] duration-200 hover:bg-ink hover:text-bg active:scale-[0.98]"
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
              <CopyLinkButton />
            </div>

            <section
              aria-labelledby={`${titleId}-why`}
              className="mt-10 flex max-w-[62ch] animate-rise-sm gap-4 rounded-card border border-line bg-surface p-5"
              style={enter(5)}
            >
              <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-(--tone) text-accent-ink">
                <Sparkles className="size-5" strokeWidth={1.75} />
              </span>
              <div className="min-w-0">
                <h2 id={`${titleId}-why`} className="font-display text-lg font-medium tracking-[-0.01em] [:lang(hi)_&]:leading-normal">
                  {t('detail.why')}
                </h2>
                <p className="mt-1.5 text-pretty text-[0.9375rem] leading-relaxed text-muted">
                  {why.kind === 'hashtag'
                    ? t('detail.whyHashtag', { tag: why.tag })
                    : why.kind === 'category'
                      ? t('detail.whyCategory', { category })
                      : t('detail.whyOther', { category })}
                </p>
                {why.kind === 'other' ? (
                  <Link
                    href="/settings"
                    className="mt-3 inline-flex h-11 items-center text-sm font-medium underline decoration-ink/40 underline-offset-4 transition-colors hover:decoration-ink"
                  >
                    {t('detail.openSettings')}
                  </Link>
                ) : null}
              </div>
            </section>
          </div>

          <aside
            aria-labelledby={`${titleId}-glance`}
            className="h-fit animate-rise-sm rounded-card border border-line bg-surface p-6 @4xl:sticky @4xl:top-24"
            style={enter(3)}
          >
            <h2 id={`${titleId}-glance`} className="font-display text-xl font-medium tracking-[-0.01em] [:lang(hi)_&]:leading-normal">
              {t('detail.glance')}
            </h2>

            <div className="mt-5 flex items-center gap-5">
              <ScoreRing score={item.score} />
              <div className="min-w-0">
                <p className="text-sm font-medium">{t('detail.score')}</p>
                <p className="mt-1 text-pretty text-[0.8125rem] leading-snug text-muted">{t('detail.scoreHint')}</p>
              </div>
            </div>

            <dl className="mt-5">
              <Fact label={t('detail.source')}>{item.source}</Fact>
              {item.author ? <Fact label={t('detail.author')}>{item.author}</Fact> : null}
              {date ? <Fact label={t('detail.published')}>{date}</Fact> : null}
              {host ? <Fact label={t('detail.link')}>{host}</Fact> : null}
            </dl>
          </aside>
        </div>
      </article>

      {related.length > 0 ? (
        <section aria-labelledby={`${titleId}-related`} className="mt-16">
          <div className="mb-5 flex items-center gap-4">
            <h2
              id={`${titleId}-related`}
              className="font-display text-2xl font-medium tracking-[-0.015em] [:lang(hi)_&]:leading-normal"
            >
              {t('detail.related', { category })}
            </h2>
            <span aria-hidden="true" className="h-px flex-1 bg-line" />
          </div>
          <ul role="list" className="grid gap-5 @4xl:grid-cols-3">
            {related.map((other, index) => (
              <li key={other.id} className="min-w-0 animate-rise-sm" style={{ animationDelay: `${index * 55}ms` }}>
                <ContentCard item={other} className="h-full" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
