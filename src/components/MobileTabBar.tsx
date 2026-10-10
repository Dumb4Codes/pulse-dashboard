'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { m } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useFavoritesCount } from '@/hooks/useFavoritesCount';
import { SPRING_SNAPPY } from '@/lib/motion';
import { NAV_ITEMS, isNavActive } from './navItems';

/**
 * Phone navigation (< md): a floating glass tab bar pinned to the bottom, lifted above the iOS
 * home indicator by the safe-area inset. Four 48px-tall targets. Nested radii: 22px bar - 6px
 * padding = 16px items (`rounded-2xl`). Uses its own `tab-pill` layoutId so it never fights the
 * sidebar's `nav-pill` (both exist in the DOM; only one is displayed).
 *
 * Surface: `glass-panel` (88% opaque), not `glass` (70%). Page content scrolls underneath this bar,
 * and muted 12px labels over a 70% veil dropped to ~3:1 whenever a coral button or a dark photo sat
 * behind it; at 88% the worst case stays above 4.5:1 in both themes.
 */
export function MobileTabBar() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const favorites = useFavoritesCount();

  return (
    <nav
      aria-label={t('nav.label')}
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 md:hidden"
    >
      <m.ul
        layoutRoot
        className="glass-panel grid grid-cols-4 gap-1 rounded-[calc(var(--radius)+4px)] p-1.5 shadow-[var(--shadow)]"
      >
        {NAV_ITEMS.map((item) => {
          const active = isNavActive(item.href, pathname);
          const Icon = item.icon;
          const count = item.showCount ? favorites : 0;
          return (
            <li key={item.href} className="min-w-0">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={clsx(
                  'relative isolate flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-xs font-medium transition-colors',
                  active ? 'text-bg' : 'text-muted hover:text-ink',
                )}
              >
                {active && (
                  <m.span
                    layoutId="tab-pill"
                    transition={SPRING_SNAPPY}
                    aria-hidden="true"
                    className="absolute inset-0 -z-10 rounded-[inherit] bg-ink"
                  />
                )}
                <span className="relative">
                  <Icon aria-hidden="true" className="size-5" strokeWidth={1.75} />
                  {count > 0 && (
                    <span
                      className={clsx(
                        'absolute -right-3 -top-2 grid h-[1.125rem] min-w-[1.125rem] place-items-center rounded-full px-1 text-xs font-medium leading-none tabular-nums',
                        // The badge overhangs the pill's top edge, so on the active tab it must be opaque (a
                        // translucent fill read differently over the pill and over the bar behind it).
                        active ? 'bg-accent-strong text-accent-ink' : 'bg-ink text-bg',
                      )}
                    >
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </span>
                <span className="max-w-full truncate">{t(item.labelKey)}</span>
              </Link>
            </li>
          );
        })}
      </m.ul>
    </nav>
  );
}
