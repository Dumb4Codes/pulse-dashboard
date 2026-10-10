"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { SearchX } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DetailSkeleton } from "@/components/detail/DetailSkeleton";
import { ItemDetail } from "@/components/detail/ItemDetail";
import { EmptyState } from "@/components/EmptyState";
import { useContentItem } from "@/hooks/useContentItem";
import { readContentId } from "@/lib/contentPath";

const PRIMARY_LINK =
  "inline-flex h-11 items-center justify-center rounded-full bg-ink px-6 text-sm font-medium text-bg transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.98]";

/**
 * Details for one card (`/content/:id`). Reached from a card, a Trending tile or a search result, and
 * also directly from a bookmark: `useContentItem` finds the item in memory or asks the server, and
 * this page only decides which of loading / not found / the item to show.
 */
export default function ContentPage() {
  const { t } = useTranslation();
  const params = useParams<{ id: string }>();
  const id = readContentId(params.id);
  const { status, item, related } = useContentItem(id);

  const title = item?.title;
  useEffect(() => {
    if (title) document.title = `${title} — Pulse`;
  }, [title]);

  if (status === "ready" && item) return <ItemDetail key={item.id} item={item} related={related} />;
  if (status === "missing") {
    return (
      <EmptyState
        icon={SearchX}
        title={t("detail.notFound.title")}
        body={t("detail.notFound.body")}
        action={
          <Link href="/" className={PRIMARY_LINK}>
            {t("detail.notFound.cta")}
          </Link>
        }
      />
    );
  }
  return <DetailSkeleton />;
}
