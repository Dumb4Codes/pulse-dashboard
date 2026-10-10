"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type FocusEvent } from "react";
import Link from "next/link";
import clsx from "clsx";
import { AnimatePresence, m } from "framer-motion";
import { Heart, HeartOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ContentCard } from "@/components/ContentCard";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { EASE_IN, SPRING_LIFT } from "@/lib/motion";
import type { ContentItem, ContentType } from "@/lib/types";
import { useAppSelector } from "@/store/hooks";
import { selectFavorites } from "@/store/slices/favorites";

type Filter = "all" | ContentType;

const FILTERS = [
  { value: "all", labelKey: "favorites.all" },
  { value: "news", labelKey: "trending.news" },
  { value: "movie", labelKey: "trending.movies" },
  { value: "social", labelKey: "trending.posts" },
] as const satisfies readonly { value: Filter; labelKey: string }[];

/** Leaving the grid: quick (about 0.7x an entrance) and ease-in; the rest glide into the gap via `layout`. */
const CARD_EXIT = { duration: 0.2, ease: EASE_IN } as const;
const CARD_LAYOUT = { layout: SPRING_LIFT } as const;

const PRIMARY_LINK =
  "inline-flex h-11 items-center justify-center rounded-full bg-ink px-6 text-sm font-medium text-bg transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.98]";

/**
 * First-run illustration: an outlined heart that draws itself in, with a spark and a dot. Inline SVG
 * so it follows the theme through `currentColor` / tokens (EmptyState sets the colour). The draw-in
 * is the shared CSS keyframe, which reduced motion collapses to the finished drawing.
 */
function HeartIllustration() {
  return (
    <svg viewBox="0 0 64 64" fill="none" className="size-14" aria-hidden="true">
      <path
        d="M32 54C15 42 8 32.5 8 23.2 8 16.2 13.3 11 20 11c4.6 0 8.6 2.5 12 7.4C35.4 13.5 39.4 11 44 11c6.7 0 12 5.2 12 12.2C56 32.5 49 42 32 54Z"
        pathLength={1}
        strokeDasharray={1}
        strokeWidth={2.5}
        strokeLinejoin="round"
        className="animate-draw fill-accent/15 stroke-current"
      />
      <path d="M52 4v8M48 8h8" strokeWidth={2} strokeLinecap="round" className="stroke-accent-2" />
      <circle cx="8" cy="50" r="2.5" className="fill-accent-2" />
    </svg>
  );
}

/**
 * Favorites: everything the reader hearted, newest first, as the same `ContentCard`s the feed uses.
 * Cards come from the saved snapshot in the store, never from the API, so they survive an item
 * leaving the feed. Filter pills (native radios, so arrow keys work for free) narrow by type, and
 * removing a card lets the others glide into the gap (`layout`, `popLayout`).
 */
export default function FavoritesPage() {
  const { t } = useTranslation();
  const saved = useAppSelector(selectFavorites);
  const [filter, setFilter] = useState<Filter>("all");
  const filterName = useId();

  // Object.values keeps insertion order (oldest first); newest first reads better.
  const items = useMemo(() => [...saved].reverse(), [saved]);
  const counts = useMemo(() => {
    const byType: Record<Filter, number> = { all: items.length, news: 0, movie: 0, social: 0 };
    for (const item of items) byType[item.type] += 1;
    return byType;
  }, [items]);
  const visible = useMemo<ContentItem[]>(
    () => (filter === "all" ? items : items.filter((item) => item.type === filter)),
    [items, filter],
  );

  // Focus hand-off. Un-hearting a card removes it, and the heart that had focus goes with it, which
  // would drop keyboard focus to <body> (the next Tab starts again at the skip link). So when the
  // list shrinks and focus was on the leaving card (or already lost), move it to the card that
  // slides into that row, or to the empty state's next step when nothing is left.
  const listRef = useRef<HTMLUListElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const focusedRow = useRef(0);
  const rememberRow = useCallback((event: FocusEvent<HTMLUListElement>) => {
    const row = event.target.closest("li");
    const index = row ? Array.prototype.indexOf.call(event.currentTarget.children, row) : -1;
    if (index !== -1) focusedRow.current = index;
  }, []);
  const shown = visible.length;
  const wasShown = useRef(shown);
  useEffect(() => {
    const before = wasShown.current;
    wasShown.current = shown;
    if (shown >= before) return;

    const active = document.activeElement;
    const row = active instanceof HTMLElement ? active.closest<HTMLElement>("[data-favorite-id]") : null;
    const survivors = new Set(visible.map((item) => item.id));
    const leaving = row !== null && !survivors.has(row.dataset.favoriteId ?? "");
    const lost = active === null || active === document.body;
    if (!leaving && !lost) return; // focus is on a surviving card or elsewhere (a filter pill): leave it

    // The leaving card stays in the DOM until its exit finishes, so only consider the survivors.
    const hearts = [...(listRef.current?.querySelectorAll<HTMLElement>("[data-favorite-id]") ?? [])]
      .filter((li) => survivors.has(li.dataset.favoriteId ?? ""))
      .map((li) => li.querySelector<HTMLElement>("button[aria-pressed]"));
    const target = hearts.length
      ? hearts[Math.min(focusedRow.current, hearts.length - 1)]
      : bodyRef.current?.querySelector<HTMLElement>("a, button"); // empty state: its next step
    target?.focus({ preventScroll: true });
  }, [shown, visible]);

  let body;
  if (items.length === 0) {
    body = (
      <EmptyState
        icon={<HeartIllustration />}
        title={t("favorites.empty.title")}
        body={t("favorites.empty.body")}
        action={
          <Link href="/" className={PRIMARY_LINK}>
            {t("favorites.empty.cta")}
          </Link>
        }
      />
    );
  } else if (visible.length === 0) {
    body = (
      <EmptyState
        icon={HeartOff}
        title={t("favorites.emptyFilter.title")}
        body={t("favorites.emptyFilter.body")}
        action={
          <button type="button" onClick={() => setFilter("all")} className={PRIMARY_LINK}>
            {t("favorites.emptyFilter.cta")}
          </button>
        }
      />
    );
  } else {
    body = (
      <div className="@container">
        <ul ref={listRef} role="list" onFocusCapture={rememberRow} className="relative grid gap-5 @4xl:grid-cols-2">
          <AnimatePresence initial={false} mode="popLayout">
            {visible.map((item, index) => (
              <m.li
                key={item.id}
                data-favorite-id={item.id}
                layout="position"
                transition={CARD_LAYOUT}
                exit={{ opacity: 0, scale: 0.96, transition: CARD_EXIT }}
                className="min-w-0"
              >
                {/* The entrance is CSS (runs without JS, collapses under reduced motion); Framer only handles leaving and re-flowing. */}
                <div className="h-full animate-rise-sm" style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}>
                  <ContentCard item={item} className="h-full" />
                </div>
              </m.li>
            ))}
          </AnimatePresence>
        </ul>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={t("favorites.title")}
        subtitle={t("favorites.subtitle")}
        actions={
          items.length > 0 ? (
            // role="status": a card leaves silently when un-hearted, so the changed count is what gets announced.
            <span
              role="status"
              className="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-medium tabular-nums"
            >
              <Heart aria-hidden="true" className="size-4 fill-current text-accent-strong" strokeWidth={2} />
              {t("favorites.count", { count: items.length })}
            </span>
          ) : null
        }
      />

      {items.length > 0 ? (
        <div role="radiogroup" aria-label={t("favorites.filterLabel")} className="mb-8 flex flex-wrap gap-2">
          {FILTERS.map(({ value, labelKey }) => {
            const checked = filter === value;
            return (
              <label key={value} className="relative cursor-pointer">
                <input
                  type="radio"
                  name={filterName}
                  value={value}
                  checked={checked}
                  onChange={() => setFilter(value)}
                  className="peer sr-only"
                />
                <span
                  className={clsx(
                    "inline-flex h-11 items-center gap-2 rounded-full border pl-4 pr-2.5 text-sm font-medium transition-[background-color,border-color,color,transform] duration-150 peer-active:scale-[0.97] sm:h-10 pointer-coarse:h-11",
                    "peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-(--ring)",
                    checked
                      ? "border-ink bg-ink text-bg"
                      : "border-ink/25 bg-surface text-ink hover:border-ink/50 hover:bg-surface-2",
                  )}
                >
                  {t(labelKey)}{" "}
                  <span
                    className={clsx(
                      "grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-xs tabular-nums",
                      checked ? "bg-bg/20" : "bg-ink/10",
                    )}
                  >
                    {counts[value]}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      ) : null}

      <div ref={bodyRef}>{body}</div>
    </div>
  );
}
