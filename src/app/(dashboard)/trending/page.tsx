"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import clsx from "clsx";
import { AnimatePresence, m } from "framer-motion";
import { Flame } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CONTENT_TYPE_META } from "@/components/contentTypeMeta";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/PageHeader";
import { TrendingBoard, TrendingSkeleton } from "@/components/TrendingBoard";
import { useTrending, type TrendingState } from "@/hooks/useTrending";
import { DURATION, EASE_IN, EASE_OUT, SPRING_SNAPPY } from "@/lib/motion";
import type { ContentType } from "@/lib/types";

const TABS = [
  { type: "news", labelKey: "trending.news" },
  { type: "movie", labelKey: "trending.movies" },
  { type: "social", labelKey: "trending.posts" },
] as const satisfies readonly { type: ContentType; labelKey: string }[];

/** Panel swap: a short fade (the tiles bring their own staggered rise), exit ~0.7x the entrance. */
const PANEL_IN = { duration: DURATION.micro + 0.04, ease: EASE_OUT } as const;
const PANEL_OUT = { duration: 0.14, ease: EASE_IN } as const;

function TabPanelBody({ state }: { state: TrendingState }) {
  const { t } = useTranslation();

  if (state.isLoading) return <TrendingSkeleton />;
  if (state.isError) {
    return <ErrorState onRetry={state.retry} title={t("trending.error.title")} body={t("trending.error.body")} />;
  }
  if (state.items.length === 0) {
    return (
      <EmptyState
        icon={Flame}
        title={t("trending.empty.title")}
        body={t("trending.empty.body")}
        action={
          <Link
            href="/settings"
            className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-6 text-sm font-medium text-bg transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.98]"
          >
            {t("trending.empty.cta")}
          </Link>
        }
      />
    );
  }
  return <TrendingBoard items={state.items} />;
}

/**
 * Trending: one tab per content source (News / Movies / Posts), each a ranked bento board of the
 * top ten by score for the reader's categories. The tabs follow the WAI-ARIA tabs pattern
 * (roving tabindex, arrow keys wrap, Home / End, selection follows focus), and the panel
 * cross-fades with `AnimatePresence mode="wait"` so the old board is gone before the new one rises.
 */
export default function TrendingPage() {
  const { t } = useTranslation();
  const trending = useTrending();
  const [active, setActive] = useState<ContentType>("news");
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const tabId = (type: ContentType) => `${baseId}-tab-${type}`;
  const panelId = `${baseId}-panel`;
  const activeLabel = TABS.find((tab) => tab.type === active)?.labelKey ?? TABS[0].labelKey;

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const current = TABS.findIndex((tab) => tab.type === active);
    let next: number;
    switch (event.key) {
      case "ArrowRight":
        next = (current + 1) % TABS.length;
        break;
      case "ArrowLeft":
        next = (current - 1 + TABS.length) % TABS.length;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = TABS.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    setActive(TABS[next].type);
    tabRefs.current[next]?.focus();
  }

  return (
    <div>
      <PageHeader title={t("trending.title")} subtitle={t("trending.subtitle")} />

      <div className="mb-8 lg:mb-10">
        <div
          role="tablist"
          aria-label={t("trending.tabs")}
          onKeyDown={onKeyDown}
          className="flex w-full rounded-full border border-line bg-surface p-1 shadow-[0_1px_0_color-mix(in_oklab,var(--ink)_6%,transparent)] sm:inline-flex sm:w-auto"
        >
          {TABS.map((tab, index) => {
            const selected = tab.type === active;
            const Icon = CONTENT_TYPE_META[tab.type].icon;
            return (
              <button
                key={tab.type}
                ref={(el) => {
                  tabRefs.current[index] = el;
                }}
                type="button"
                role="tab"
                id={tabId(tab.type)}
                aria-selected={selected}
                aria-controls={panelId}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(tab.type)}
                className={clsx(
                  "relative isolate inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-full px-3 text-sm font-medium transition-colors duration-200 sm:flex-none sm:px-5",
                  selected ? "text-bg" : "text-muted hover:text-ink",
                )}
              >
                {selected ? (
                  <m.span
                    layoutId="trending-tab-pill"
                    aria-hidden="true"
                    transition={SPRING_SNAPPY}
                    className="absolute inset-0 -z-10 rounded-full bg-ink"
                  />
                ) : null}
                <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={2} />
                <span className="truncate">{t(tab.labelKey)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <m.div
          key={active}
          role="tabpanel"
          id={panelId}
          aria-labelledby={tabId(active)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: PANEL_IN }}
          exit={{ opacity: 0, transition: PANEL_OUT }}
        >
          <h2 className="sr-only">{t(activeLabel)}</h2>
          <TabPanelBody state={trending[active]} />
        </m.div>
      </AnimatePresence>
    </div>
  );
}
