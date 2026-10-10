import type { HTMLAttributes } from 'react';
import clsx from 'clsx';
import { readableOn } from '@/lib/color';

/** First visible character of the display name, upper-cased (code-point safe, so emoji / Devanagari are not split). */
export function initialOf(name: string): string {
  const [first] = Array.from(name.trim());
  return first ? first.toUpperCase() : '?';
}

interface AvatarProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children' | 'color' | 'style'> {
  name: string;
  /** Any `#rgb` / `#rrggbb` swatch. The glyph colour is derived from it for contrast. */
  color: string;
  /** Size and type scale (`size-9 text-base`); a ring or margin may be added too. */
  className?: string;
}

/**
 * Initial-on-colour avatar. Decorative (`aria-hidden`): the name is always rendered next to it.
 * The swatch is user data (any hex), so its colour is an inline style rather than a token, and the
 * letter picks white or black, whichever clears the higher WCAG contrast on that colour.
 */
export function Avatar({ name, color, className, ...rest }: AvatarProps) {
  return (
    <span
      {...rest}
      aria-hidden="true"
      style={{ backgroundColor: color }}
      className={clsx(
        'grid shrink-0 place-items-center rounded-full font-medium',
        readableOn(color) === 'dark' ? 'text-black' : 'text-white',
        className,
      )}
    >
      {initialOf(name)}
    </span>
  );
}
