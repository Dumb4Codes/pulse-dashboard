import { Clapperboard, MessageCircle, Newspaper, type LucideIcon } from 'lucide-react';
import type { ContentType } from '@/lib/types';

export interface ContentTypeMeta {
  icon: LucideIcon;
  /** i18n key for the type badge ("News" / "Movie" / "Post"). */
  labelKey: 'card.type.news' | 'card.type.movie' | 'card.type.social';
  /** i18n key for the call-to-action ("Read more" / "Play now" / "View post"). */
  ctaKey: 'card.read' | 'card.play' | 'card.view';
  /**
   * Declares `--tone` for the subtree: the type's identity colour, derived from the design tokens so
   * it follows the theme. Each tone keeps >= 3:1 against `text-accent-ink` in both themes
   * (news 5.5 / 8.2, movie 5.4 / 5.8, post 4.4 / 6.4).
   */
  tone: string;
}

/** Single source of truth for how each content type looks and reads (card badge, image fallback, CTA). */
export const CONTENT_TYPE_META: Record<ContentType, ContentTypeMeta> = {
  news: {
    icon: Newspaper,
    labelKey: 'card.type.news',
    ctaKey: 'card.read',
    tone: '[--tone:color-mix(in_oklab,var(--accent)_80%,var(--ink))]',
  },
  movie: {
    icon: Clapperboard,
    labelKey: 'card.type.movie',
    ctaKey: 'card.play',
    tone: '[--tone:var(--accent-2)]',
  },
  social: {
    icon: MessageCircle,
    labelKey: 'card.type.social',
    ctaKey: 'card.view',
    tone: '[--tone:color-mix(in_oklab,var(--accent)_50%,var(--accent-2))]',
  },
};
