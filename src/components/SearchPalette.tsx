'use client';

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { ArrowDown, ArrowUp, CornerDownLeft, LoaderCircle, RotateCw, Search, SearchX, TriangleAlert, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { contentHref } from '@/lib/contentPath';
import { safeHttpUrl } from '@/lib/safeUrl';
import type { ContentItem, ContentType } from '@/lib/types';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { useSearchQuery, type SearchResult } from '@/store/api';
import { useAppDispatch } from '@/store/hooks';
import { itemViewed } from '@/store/slices/recent';
import { CONTENT_TYPE_META } from './contentTypeMeta';

export interface SearchPaletteProps {
  open: boolean;
  onClose: () => void;
}

/** Below this many characters (after trimming) nothing is requested. Mirrors the server's guard in /api/search. */
const MIN_CHARS = 2;
/** Pause after the last keystroke before a request is made. */
const DEBOUNCE_MS = 300;
/** The server clamps `q` to 100 characters; the field simply cannot hold more. */
const MAX_QUERY = 100;

const GROUPS = [
  { key: 'news', type: 'news', labelKey: 'search.news' },
  { key: 'movies', type: 'movie', labelKey: 'search.movies' },
  { key: 'social', type: 'social', labelKey: 'search.social' },
] as const satisfies ReadonlyArray<{ key: keyof SearchResult; type: ContentType; labelKey: string }>;

interface Option {
  /** Stable across renders and groups: `${type}:${item.id}`. */
  key: string;
  /** DOM id, referenced by the input's `aria-activedescendant`. */
  id: string;
  item: ContentItem;
}

interface Group {
  key: (typeof GROUPS)[number]['key'];
  type: ContentType;
  labelKey: (typeof GROUPS)[number]['labelKey'];
  options: Option[];
}

/** Results -> labelled groups of options. Every result opens its details page, so none is left out. */
function buildGroups(results: SearchResult | undefined, idPrefix: string): Group[] {
  if (!results) return [];
  const groups: Group[] = [];
  let index = 0;
  for (const group of GROUPS) {
    const options: Option[] = [];
    for (const item of results[group.key]) {
      options.push({ key: `${item.type}:${item.id}`, id: `${idPrefix}-option-${index}`, item });
      index += 1;
    }
    if (options.length > 0) groups.push({ key: group.key, type: group.type, labelKey: group.labelKey, options });
  }
  return groups;
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** One case-insensitive pattern: the whole phrase first (longest wins), then each word of 2+ characters. */
function buildHighlighter(query: string): RegExp | null {
  if (query.length < MIN_CHARS) return null;
  const words = query.split(/\s+/).filter((word) => word.length >= MIN_CHARS);
  const terms = [...new Set([query, ...words])].slice(0, 8).sort((a, b) => b.length - a.length);
  return new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'iu');
}

const EXCERPT_LEAD = 24;

/**
 * Long text is cropped to start a few words before its first match, so a hit deep in a description is
 * not lost to the one-line truncation (the card list is cut at the row's width, not at the match).
 */
function excerpt(text: string, pattern: RegExp | null): string {
  const match = pattern?.exec(text);
  if (!match || match.index <= EXCERPT_LEAD + 8) return text;
  let start = match.index - EXCERPT_LEAD;
  const wordStart = text.indexOf(' ', start); // do not begin mid-word
  if (wordStart !== -1 && wordStart < match.index) start = wordStart + 1;
  return `…${text.slice(start)}`;
}

/**
 * Splits `text` around the matches of `pattern` and wraps each match in a `<mark>`. The pieces are
 * React text nodes, never markup, so whatever the API (or the user) put in the string stays inert.
 * The pattern has one capture group, so `split` returns the matches at the odd indices.
 */
function Highlight({ text, pattern }: { text: string; pattern: RegExp | null }) {
  if (!pattern || !text) return <>{text}</>;
  return (
    <>
      {text.split(pattern).map((part, index) =>
        index % 2 === 1 ? (
          <mark
            key={index}
            className="rounded-[3px] bg-accent/25 px-px text-ink forced-colors:bg-[Mark] forced-colors:text-[MarkText]"
          >
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

/**
 * 44px result thumbnail. A plain `<img>` like the cards (arbitrary remote hosts); when there is no
 * usable image, or it fails to load, a type-tinted tile with the type's icon stands in. `CardImage`
 * is not reused: its fallback is a 160px ghost glyph cropped for a card, which is noise at this size.
 */
function Thumb({ item }: { item: ContentItem }) {
  const src = safeHttpUrl(item.image);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const { icon: Icon, tone } = CONTENT_TYPE_META[item.type];
  const showImage = src !== null && failedSrc !== src;

  return (
    <span
      aria-hidden="true"
      className={clsx(
        'relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-md bg-surface-2 ring-1 ring-inset ring-ink/10',
        tone,
      )}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- deliberate: arbitrary remote hosts, see CardImage
        <img
          src={src}
          alt=""
          width={44}
          height={44}
          loading="lazy"
          decoding="async"
          draggable={false}
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(src)}
          className="size-full object-cover"
        />
      ) : (
        <span className="grid size-full place-items-center bg-[linear-gradient(135deg,color-mix(in_oklab,var(--tone)_34%,var(--surface-2)),color-mix(in_oklab,var(--tone)_10%,var(--surface-2)))] text-(--tone)">
          <Icon className="size-5" strokeWidth={1.75} />
        </span>
      )}
    </span>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd
      aria-hidden="true"
      className="inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-line bg-surface-2 px-1 font-mono text-xs leading-none text-muted"
    >
      {children}
    </kbd>
  );
}

/** Locks page scroll while the palette is open, keeping the layout steady when the scrollbar disappears. */
function useBodyScrollLock() {
  useLayoutEffect(() => {
    const { body, documentElement } = document;
    const previous = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
    const scrollbar = window.innerWidth - documentElement.clientWidth;
    body.style.overflow = 'hidden';
    if (scrollbar > 0 && documentElement.clientWidth > 0) body.style.paddingRight = `${scrollbar}px`;
    return () => {
      body.style.overflow = previous.overflow;
      body.style.paddingRight = previous.paddingRight;
    };
  }, []);
}

const TABBABLE = 'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

function tabbables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(TABBABLE)).filter(
    (el) => getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden',
  );
}

function PaletteDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const baseId = useId();
  const listId = `${baseId}-list`;

  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  /** True from the moment a close is requested: the focus guard must not fight the caller restoring focus. */
  const closingRef = useRef(false);
  /** Set by arrow keys so only keyboard moves scroll the list (hover must never make it jump). */
  const keyboardMoveRef = useRef(false);

  const [query, setQuery] = useState('');
  const [selection, setSelection] = useState<{ query: string; key: string } | null>(null);

  const typed = query.trim();
  const debounced = useDebouncedValue(typed, DEBOUNCE_MS);
  const belowMin = typed.length < MIN_CHARS;
  const canSearch = debounced.length >= MIN_CHARS;

  // RTK Query keys the cache by argument, so a response for an older query can never land on the
  // current one. `data` keeps the previous query's results on screen (dimmed) while the next loads;
  // `currentData` is only ever the answer to the query now being shown.
  const { data, currentData, isFetching, isError, refetch } = useSearchQuery({ q: debounced }, { skip: !canSearch });

  const showError = !belowMin && canSearch && isError;
  const results = belowMin || showError || !canSearch ? undefined : data;
  const groups = useMemo(() => buildGroups(results, baseId), [results, baseId]);
  const options = useMemo(() => groups.flatMap((group) => group.options), [groups]);
  const settled = canSearch && typed === debounced && currentData !== undefined && !isFetching;
  const busy = !belowMin && !showError && !settled;
  const noResults = !belowMin && !showError && settled && options.length === 0;
  const loading = !belowMin && !showError && options.length === 0 && !noResults;

  // The highlighted row follows the query: a new query always starts on its first result.
  const selectedIndex =
    selection && selection.query === debounced ? options.findIndex((option) => option.key === selection.key) : -1;
  const activeIndex = options.length === 0 ? -1 : Math.max(0, selectedIndex);
  const activeOption = activeIndex >= 0 ? options[activeIndex] : undefined;
  const pattern = useMemo(() => buildHighlighter(typed), [typed]);

  const requestClose = useCallback(() => {
    closingRef.current = true;
    onClose();
    queueMicrotask(() => {
      closingRef.current = false;
    });
  }, [onClose]);

  const select = (option: Option) => setSelection({ query: debounced, key: option.key });

  // A result opens its details page. The item is saved first, so the page can show it at once (and
  // again after a reload) without asking the server.
  const openOption = (option: Option) => {
    dispatch(itemViewed(option.item));
    router.push(contentHref(option.item.id));
    requestClose();
  };

  const move = (delta: number) => {
    if (options.length === 0) return;
    keyboardMoveRef.current = true;
    select(options[(activeIndex + delta + options.length) % options.length]);
  };

  const onInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      move(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      move(-1);
    } else if (event.key === 'Enter' && activeOption) {
      event.preventDefault();
      openOption(activeOption);
    }
  };

  // Clicking dead space inside the panel (or a result) must not pull focus out of the field.
  const keepInputFocus = (event: ReactMouseEvent<HTMLElement>) => {
    if (event.target instanceof Element && event.target.closest('input, button')) return;
    event.preventDefault();
  };

  const retry = () => {
    // The retry button unmounts as soon as the request restarts; park focus in the field first.
    inputRef.current?.focus({ preventScroll: true });
    void refetch();
  };

  useBodyScrollLock();

  // Focus the field on open and hand focus back on close. If the caller already moved it (the header
  // focuses its trigger), leave it alone.
  useLayoutEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    inputRef.current?.focus({ preventScroll: true });
    return () => {
      const active = document.activeElement;
      const lost = !active || active === document.body || (panel?.contains(active) ?? false);
      if (lost && opener && opener !== document.body && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  // Escape closes; Tab wraps inside the panel; focus that escapes (browser chrome, a stray script) is pulled back.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        requestClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const stops = tabbables(panel);
      if (stops.length === 0) {
        event.preventDefault();
        return;
      }
      const first = stops[0];
      const last = stops[stops.length - 1];
      const active = document.activeElement;
      if (!(active instanceof Node) || !panel.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const onFocusIn = (event: FocusEvent) => {
      if (closingRef.current) return;
      if (event.target instanceof Node && panelRef.current && !panelRef.current.contains(event.target)) {
        inputRef.current?.focus({ preventScroll: true });
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('focusin', onFocusIn);
    };
  }, [requestClose]);

  // Keep the keyboard-selected row in view. Scrolls the list's own scroller only (never the page), and
  // for the first row of a group it aligns the group label, so the heading is not left off-screen.
  useEffect(() => {
    if (!keyboardMoveRef.current) return;
    keyboardMoveRef.current = false;
    const scroller = scrollerRef.current;
    const row = activeOption ? document.getElementById(activeOption.id) : null;
    if (!scroller || !row) return;
    if (activeIndex === 0) {
      scroller.scrollTop = 0;
      return;
    }
    const group = row.parentElement;
    const topEdge = group && row.previousElementSibling === group.firstElementChild ? group : row;
    const bounds = scroller.getBoundingClientRect();
    const above = topEdge.getBoundingClientRect().top - bounds.top;
    const below = row.getBoundingClientRect().bottom - bounds.bottom;
    if (above < 0) scroller.scrollTop += above;
    else if (below > 0) scroller.scrollTop += below;
  }, [activeIndex, activeOption]);

  return (
    <div className="fixed inset-0 z-70 flex items-start justify-center px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 sm:pt-[11dvh]">
      {/* A flat veil in the page colour (no full-viewport blur: that is the expensive kind). */}
      <div aria-hidden="true" onClick={requestClose} className="absolute inset-0 animate-scrim-in touch-none bg-bg/70" />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('search.title')}
        onMouseDown={keepInputFocus}
        className="glass-panel relative flex max-h-[min(36rem,calc(100dvh-1.5rem))] w-full max-w-160 origin-top animate-palette-in flex-col overflow-hidden rounded-card shadow-(--shadow-lift) sm:max-h-[min(36rem,calc(89dvh-1.5rem))]"
      >
        {/* Focus is shown as a ring-coloured rule under the whole row (the field has no box of its own to outline). */}
        <div className="flex items-center gap-3 border-b border-line/70 px-4 py-2.5 has-[input:focus-visible]:shadow-[inset_0_-2px_0_var(--ring)]">
          <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center text-muted">
            {busy ? (
              <LoaderCircle className="size-5 animate-spin" strokeWidth={1.75} />
            ) : (
              <Search className="size-5" strokeWidth={1.75} />
            )}
          </span>
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-label={t('search.title')}
            aria-autocomplete="list"
            aria-expanded={options.length > 0}
            aria-controls={options.length > 0 ? listId : undefined}
            aria-activedescendant={activeOption?.id}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder={t('search.placeholder')}
            maxLength={MAX_QUERY}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            inputMode="search"
            enterKeyHint="go"
            className="h-11 min-w-0 flex-1 rounded-lg bg-transparent px-1 text-lg text-ink placeholder:text-muted focus-visible:outline-hidden!"
          />
          <button
            type="button"
            onClick={requestClose}
            aria-label={t('search.close')}
            className="grid h-11 min-w-11 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:text-ink sm:h-8 sm:min-w-0 sm:px-0.5"
          >
            <X aria-hidden="true" className="size-5 sm:hidden" strokeWidth={1.75} />
            <kbd
              aria-hidden="true"
              className="hidden h-6 items-center rounded-md border border-line bg-surface-2 px-1.5 font-mono text-xs leading-none sm:inline-flex"
            >
              esc
            </kbd>
          </button>
        </div>

        <div ref={scrollerRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
          <div role="status">
            {belowMin && (
              <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
                <p className="max-w-[32ch] text-pretty text-[0.9375rem] text-muted">{t('search.minChars')}</p>
                <ul aria-hidden="true" className="flex flex-wrap justify-center gap-2">
                  {GROUPS.map((group) => {
                    const { icon: Icon, tone } = CONTENT_TYPE_META[group.type];
                    return (
                      <li
                        key={group.key}
                        className={clsx(
                          'inline-flex items-center gap-1.5 rounded-full bg-surface-2 py-1 pl-1 pr-3 text-xs font-medium text-ink',
                          tone,
                        )}
                      >
                        <span className="grid size-6 place-items-center rounded-full bg-(--tone) text-accent-ink">
                          <Icon className="size-3.5" strokeWidth={2} />
                        </span>
                        {t(group.labelKey)}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {noResults && (
              <div className="flex flex-col items-center px-6 py-10 text-center">
                <span aria-hidden="true" className="mb-4 grid size-12 place-items-center rounded-full bg-surface-2 text-muted">
                  <SearchX className="size-6" strokeWidth={1.5} />
                </span>
                <p className="max-w-[36ch] text-balance font-display text-xl/[1.3] font-medium tracking-[-0.01em] wrap-anywhere">
                  {t('search.noResults', { query: typed })}
                </p>
                <p className="mt-2 text-sm text-muted">{t('search.noResultsHint')}</p>
              </div>
            )}

            {loading && <span className="sr-only">{t('search.searching')}</span>}
            {settled && options.length > 0 && (
              <span className="sr-only">{t('search.resultCount', { count: options.length })}</span>
            )}
          </div>

          {loading && (
            <ul aria-hidden="true" className="flex flex-col gap-0.5">
              {[0, 1, 2].map((row) => (
                <li key={row} className="flex items-center gap-3 p-1.5">
                  <span className="skeleton size-11 shrink-0 rounded-md" />
                  <span className="flex min-w-0 flex-1 flex-col gap-2">
                    <span className="skeleton block h-3.5 w-3/5 rounded-md" />
                    <span className="skeleton block h-3 w-4/5 rounded-md" />
                  </span>
                </li>
              ))}
            </ul>
          )}

          {showError && (
            <div
              role="alert"
              className="m-1 flex flex-col items-start gap-3 rounded-xl border border-danger/30 bg-danger/5 p-4 sm:flex-row sm:items-center"
            >
              <TriangleAlert aria-hidden="true" className="size-5 shrink-0 text-danger" strokeWidth={1.75} />
              <p className="flex-1 text-sm leading-relaxed text-ink">{t('search.error')}</p>
              <button
                type="button"
                onClick={retry}
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-ink px-4 text-sm font-medium text-bg transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.98]"
              >
                <RotateCw aria-hidden="true" className="size-4" strokeWidth={2} />
                {t('feed.retry')}
              </button>
            </div>
          )}

          {options.length > 0 && (
            <div
              id={listId}
              role="listbox"
              aria-label={t('search.resultsLabel')}
              aria-busy={!settled}
              className={clsx('flex flex-col gap-1 transition-opacity duration-150', !settled && 'opacity-60')}
            >
              {groups.map((group) => {
                const labelId = `${baseId}-group-${group.key}`;
                const { icon: GroupIcon } = CONTENT_TYPE_META[group.type];
                return (
                  <div key={group.key} role="group" aria-labelledby={labelId} className="flex flex-col gap-0.5">
                    <div
                      id={labelId}
                      className="flex items-center gap-2 px-2 pb-1 pt-2.5 text-xs font-medium uppercase leading-none tracking-[0.08em] text-muted [:lang(hi)_&]:leading-normal [:lang(hi)_&]:tracking-normal"
                    >
                      <GroupIcon aria-hidden="true" className="size-3.5" strokeWidth={2} />
                      {t(group.labelKey)}
                    </div>
                    {group.options.map((option) => {
                      const active = option === activeOption;
                      const { item } = option;
                      const detail = item.description.trim();
                      return (
                        <div
                          key={option.key}
                          id={option.id}
                          role="option"
                          aria-selected={active}
                          onPointerMove={() => {
                            if (!active) select(option);
                          }}
                          onClick={() => openOption(option)}
                          className={clsx(
                            'relative flex min-h-14 cursor-pointer items-center gap-3 rounded-xl p-1.5 pr-3 transition-colors forced-colors:outline-2 forced-colors:-outline-offset-2',
                            active
                              ? "bg-surface-2 before:absolute before:inset-y-3 before:left-0 before:w-0.75 before:rounded-full before:bg-accent-strong before:content-['']"
                              : 'forced-colors:outline-0',
                          )}
                        >
                          <Thumb item={item} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[0.9375rem] font-medium leading-snug">
                              <Highlight text={item.title} pattern={pattern} />
                            </span>
                            <span className="block truncate text-sm leading-snug text-muted">
                              <Highlight text={detail ? excerpt(detail, pattern) : item.source} pattern={pattern} />
                            </span>
                          </span>
                          {detail && (
                            <span className="hidden max-w-32 shrink-0 truncate text-xs text-muted sm:block">
                              {item.source}
                            </span>
                          )}
                          <CornerDownLeft
                            aria-hidden="true"
                            className={clsx('size-4 shrink-0 text-muted', active ? 'opacity-100' : 'opacity-0')}
                            strokeWidth={1.75}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {options.length > 0 && (
          <div className="hidden items-center gap-5 border-t border-line/70 px-4 py-2.5 text-xs text-muted sm:pointer-fine:flex">
            <span className="inline-flex items-center gap-2">
              <span className="inline-flex gap-1">
                <Kbd>
                  <ArrowUp className="size-3" strokeWidth={2} />
                </Kbd>
                <Kbd>
                  <ArrowDown className="size-3" strokeWidth={2} />
                </Kbd>
              </span>
              {t('search.hint.navigate')}
            </span>
            <span className="inline-flex items-center gap-2">
              <Kbd>
                <CornerDownLeft className="size-3" strokeWidth={2} />
              </Kbd>
              {t('search.hint.open')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Command-palette search. `Header` mounts it lazily (`next/dynamic`, `ssr: false`) and toggles `open`;
 * the dialog itself mounts fresh on every open, so each visit starts with an empty query and the RTK
 * Query subscription ends on close.
 *
 * It renders into `document.body`: the shell's stacking contexts (`isolate`, the sticky glass header)
 * would otherwise leave the mobile tab bar above the overlay.
 */
export function SearchPalette({ open, onClose }: SearchPaletteProps) {
  if (!open || typeof document === 'undefined') return null;
  return createPortal(<PaletteDialog onClose={onClose} />, document.body);
}

export default SearchPalette;
