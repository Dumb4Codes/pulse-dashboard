'use client';

import { useCallback, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSearchShortcut } from '@/hooks/useSearchShortcut';
import { AccountMenu } from './AccountMenu';
import { LanguageSwitch } from './LanguageSwitch';
import { PulseMark } from './PulseMark';
import { ThemeToggle } from './ThemeToggle';

// The palette chunk is only fetched when it is wanted: hovering the trigger warms it, otherwise the
// first open (click, "/" or Ctrl/Cmd+K) loads it on demand.
const loadPalette = () => import('./SearchPalette').then((mod) => mod.SearchPalette);
const SearchPalette = dynamic(loadPalette, { ssr: false });

/**
 * First focusable element on every dashboard page. Visually hidden until focused, then pinned to
 * the top-left; jumps to `<main id="main">`.
 */
export function SkipLink() {
  const { t } = useTranslation();
  return (
    <a
      href="#main"
      className="fixed left-3 top-3 z-[60] -translate-y-24 rounded-xl bg-ink px-4 py-3 text-sm font-medium text-bg shadow-[var(--shadow)] transition-transform focus:translate-y-0"
    >
      {t('sr.skipToContent')}
    </a>
  );
}

/**
 * Sticky blurred app bar: search trigger (styled like an input; opens the palette), language,
 * theme and account controls. On phones, where the sidebar is gone, it also carries the logo.
 */
export function Header() {
  const { t } = useTranslation();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  const openPalette = useCallback(() => {
    setMounted(true);
    setOpen(true);
  }, []);
  const closePalette = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);
  useSearchShortcut(openPalette);

  return (
    <>
      <header className="glass sticky top-0 z-20 flex h-16 items-center gap-1.5 border-0 border-b px-4 sm:gap-2 sm:px-6 lg:px-10">
        {/* p-1.5 / -ml-1.5: the 32px mark gets a 44px hit area without moving it. */}
        <Link href="/" aria-label="Pulse" className="-ml-1.5 shrink-0 rounded-xl p-1.5 md:hidden">
          <PulseMark className="size-8" />
        </Link>

        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="dialog"
          aria-keyshortcuts="/"
          onClick={openPalette}
          onPointerEnter={() => void loadPalette()}
          className="flex h-11 min-w-0 max-w-xl flex-1 items-center gap-2.5 rounded-xl border border-ink/25 bg-surface/70 px-3.5 text-left text-sm text-muted transition-colors hover:border-ink/45 hover:bg-surface"
        >
          <Search aria-hidden="true" className="size-4.5 shrink-0" strokeWidth={1.75} />
          {/* Phones show the short word; the full hint stays in the accessible name (sr-only), and the visible word is contained in it. */}
          <span className="truncate max-sm:sr-only">{t('header.searchHint')}</span>
          <span aria-hidden="true" className="truncate sm:hidden">
            {t('header.search')}
          </span>
          <kbd
            aria-hidden="true"
            className="ml-auto hidden shrink-0 rounded-md border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-muted sm:inline-block"
          >
            /
          </kbd>
        </button>

        <div className="ml-auto flex shrink-0 items-center">
          <LanguageSwitch />
          <ThemeToggle />
          <AccountMenu />
        </div>
      </header>

      {/* Sibling of <header>, not a child: its backdrop-filter would otherwise become the containing block of the palette's fixed overlay. */}
      {mounted && <SearchPalette open={open} onClose={closePalette} />}
    </>
  );
}
