import { Flame, Heart, LayoutGrid, Settings, type LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  /** i18n key for the visible label. */
  labelKey: 'nav.feed' | 'nav.trending' | 'nav.favorites' | 'nav.settings';
  icon: LucideIcon;
  /** The favorites entry shows the saved-items count. */
  showCount?: boolean;
}

/** Single source of truth for the sidebar, icon rail and mobile tab bar. */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/', labelKey: 'nav.feed', icon: LayoutGrid },
  { href: '/trending', labelKey: 'nav.trending', icon: Flame },
  { href: '/favorites', labelKey: 'nav.favorites', icon: Heart, showCount: true },
  { href: '/settings', labelKey: 'nav.settings', icon: Settings },
];

/** `/` is only active on `/`; other items also match their nested routes. */
export function isNavActive(href: string, pathname: string | null): boolean {
  if (!pathname) return false;
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}
