import type { ReactNode } from 'react';
import clsx from 'clsx';

interface NumeralProps {
  children: ReactNode;
  /**
   * `ink`: stroked with the page ink, for use on a surface.
   * `scrim`: stroked with `--on-scrim`, for use on a photograph under a scrim (the caller declares
   * `--scrim` / `--on-scrim`, see `TrendingBoard`).
   */
  tone?: 'ink' | 'scrim';
  className?: string;
}

/**
 * Oversized Fraunces numeral drawn as an outline (transparent fill, stroked edge): the page's
 * editorial signature, used for trending ranks and settings section numbers. Decorative
 * (`aria-hidden`): the order is carried by the surrounding `<ol>` / heading, never by this glyph.
 * `tabular-nums` keeps two-digit ranks the same width as the others in a column. The stroke sits
 * >= 3:1 against its surface on both themes (non-text contrast), and forced-colors mode repaints
 * the fill, so it never disappears.
 */
export function Numeral({ children, tone = 'ink', className }: NumeralProps) {
  return (
    <span
      aria-hidden="true"
      className={clsx(
        'select-none font-display font-semibold leading-none tabular-nums text-transparent [paint-order:stroke_fill]',
        tone === 'ink'
          ? '[-webkit-text-stroke:1.5px_color-mix(in_oklab,var(--ink)_62%,transparent)]'
          : '[-webkit-text-stroke:2px_var(--on-scrim)]',
        className,
      )}
    >
      {children}
    </span>
  );
}
