'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { m } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useFavoritesCount } from '@/hooks/useFavoritesCount';
import { SPRING_SNAPPY } from '@/lib/motion';
import { useAppSelector } from '@/store/hooks';
import { selectPendingForCategories } from '@/store/selectors';
import { NAV_ITEMS, isNavActive } from './navItems';
import { PulseDot, PulseMark } from './PulseMark';

/**
 * Desktop (>= lg): 264px floating glass panel. Tablet (md..lg): 72px icon rail, where each label
 * becomes a tooltip shown on hover and keyboard focus (and stays the accessible name).
 * Hidden below md, where `MobileTabBar` takes over.
 *
 * Nested radii: panel radius 24px - 12px padding = 12px (`rounded-xl`) on items; on the rail the
 * padding is 8px, so items use 16px (`rounded-2xl`).
 */
export function Sidebar() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const favorites = useFavoritesCount();
  const pending = useAppSelector((s) => selectPendingForCategories(s).length);

  return (
    // layoutRoot: the pill's layout maths must ignore page scroll, because this wrapper is sticky.
    // An <aside> (complementary landmark) so the logo and the live panel are not stray content
    // outside every landmark; the brand name is not translated, same as the header's logo link.
    <m.aside layoutRoot aria-label="Pulse" className="sticky top-0 z-30 hidden h-dvh p-2 md:block lg:p-3">
      <div className="glass flex h-full flex-col rounded-[calc(var(--radius)+6px)] p-2 shadow-[var(--shadow)] lg:p-3">
        <Link
          href="/"
          className="flex h-12 items-center gap-3 rounded-2xl px-1 max-lg:justify-center lg:rounded-xl lg:px-2"
        >
          <PulseMark className="size-8 shrink-0" />
          <span className="font-display text-2xl font-medium tracking-tight max-lg:sr-only">Pulse</span>
          {/* The live dot sits on the baseline like a full stop: "Pulse." in coral. */}
          <PulseDot className="-ml-2 mb-[1.0625rem] self-end max-lg:hidden" />
        </Link>

        <nav aria-label={t('nav.label')} className="mt-6 lg:mt-8">
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const active = isNavActive(item.href, pathname);
              const Icon = item.icon;
              const count = item.showCount ? favorites : 0;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={clsx(
                      'group relative isolate flex h-11 items-center gap-3 rounded-2xl px-3 text-[0.9375rem] font-medium transition-colors lg:rounded-xl max-lg:justify-center max-lg:px-0',
                      active ? 'text-bg' : 'text-muted hover:bg-ink/5 hover:text-ink',
                    )}
                  >
                    {active && (
                      <m.span
                        layoutId="nav-pill"
                        transition={SPRING_SNAPPY}
                        aria-hidden="true"
                        className="absolute inset-0 -z-10 rounded-[inherit] bg-ink shadow-[var(--shadow)]"
                      />
                    )}
                    <Icon aria-hidden="true" className="size-5 shrink-0" strokeWidth={1.75} />
                    <span
                      className={clsx(
                        'truncate',
                        // Rail: label turns into a tooltip beside the icon (hover + keyboard focus).
                        'max-lg:pointer-events-none max-lg:absolute max-lg:left-[calc(100%+0.75rem)] max-lg:top-1/2 max-lg:-translate-y-1/2',
                        'max-lg:rounded-lg max-lg:bg-ink max-lg:px-2.5 max-lg:py-1.5 max-lg:text-xs max-lg:text-bg max-lg:opacity-0',
                        'max-lg:shadow-[var(--shadow)] max-lg:transition-opacity max-lg:duration-150',
                        'max-lg:group-hover:opacity-100 max-lg:group-focus-visible:opacity-100',
                      )}
                    >
                      {t(item.labelKey)}
                    </span>
                    {count > 0 && (
                      <m.span
                        key={count}
                        initial={{ scale: 0.7 }}
                        animate={{ scale: 1 }}
                        transition={SPRING_SNAPPY}
                        className={clsx(
                          'ml-auto grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-xs font-medium tabular-nums',
                          'max-lg:absolute max-lg:right-0.5 max-lg:top-0.5 max-lg:ml-0 max-lg:px-1',
                          active ? 'bg-bg/20 text-bg' : 'bg-surface-2 text-ink max-lg:bg-ink max-lg:text-bg',
                        )}
                      >
                        {count > 99 ? '99+' : count}
                      </m.span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mt-auto flex items-start gap-2.5 rounded-xl border border-line bg-surface-2/70 p-3.5 max-lg:justify-center max-lg:border-0 max-lg:bg-transparent max-lg:p-2">
          <PulseDot className="mt-1.5" />
          <div className="min-w-0 max-lg:sr-only">
            <p className="text-sm font-medium">{t('sidebar.liveTitle')}</p>
            <p className="mt-1 text-pretty text-[0.8125rem] leading-snug text-muted">
              {pending > 0 ? t('feed.newItems', { count: pending }) : t('sidebar.liveBody')}
            </p>
          </div>
        </div>
      </div>
    </m.aside>
  );
}
