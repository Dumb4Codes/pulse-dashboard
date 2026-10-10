'use client';

import { useCallback, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { safeHttpUrl } from '@/lib/safeUrl';
import type { ContentType } from '@/lib/types';
import { CONTENT_TYPE_META } from './contentTypeMeta';

interface CardImageProps {
  src: string;
  type: ContentType;
  /** Sizing and corner radius come from the caller; the box clips its content with `overflow-hidden`. */
  className?: string;
  /** Rendered above the scrim (type badge, play glyph, ...). */
  children?: ReactNode;
}

/**
 * Decorative card thumbnail. A plain `<img>` (NewsAPI image hosts are arbitrary, so `next/image`
 * allow-listing is impossible): lazy, async-decoded, referrer-less, and not natively draggable (so
 * it cannot hijack a drag-to-reorder gesture). The box has a fixed size from the parent, so loading
 * never shifts layout.
 *
 * When the URL is missing, not http(s), or fails to load, the image is replaced by a type-tinted
 * gradient with a large ghost icon: never a broken-image glyph. Zoom-on-hover is driven by a `group`
 * ancestor, so the card owns the hover target.
 */
export function CardImage({ src, type, className, children }: CardImageProps) {
  const safeSrc = safeHttpUrl(src);
  // Remember *which* src failed (not a boolean): a new src for the same card gets a fresh attempt.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = safeSrc !== null && failedSrc !== safeSrc;
  const { icon: Icon, tone } = CONTENT_TYPE_META[type];

  // An image that already failed before React attached `onError` (server-rendered HTML, slow
  // hydration) never re-fires the event, so look at its settled state as soon as it mounts.
  const settledCheck = useCallback(
    (img: HTMLImageElement | null) => {
      if (img && safeSrc && img.complete && img.naturalWidth === 0) setFailedSrc(safeSrc);
    },
    [safeSrc],
  );

  return (
    <div
      data-image-state={showImage ? 'image' : 'fallback'}
      className={clsx('relative isolate overflow-hidden bg-surface-2', tone, className)}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- deliberate: arbitrary remote hosts, see above
        <img
          ref={settledCheck}
          src={safeSrc}
          alt=""
          width={800}
          height={520}
          loading="lazy"
          decoding="async"
          draggable={false}
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(safeSrc)}
          className="size-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.04]"
        />
      ) : (
        // A type-tinted wash with an oversized, cropped ghost icon: it reads as a deliberate cover, not an error.
        <div
          aria-hidden="true"
          className="absolute inset-0 overflow-hidden bg-[linear-gradient(135deg,color-mix(in_oklab,var(--tone)_36%,var(--surface-2)),color-mix(in_oklab,var(--tone)_10%,var(--surface-2))_75%)]"
        >
          <Icon className="absolute -bottom-7 -right-6 size-40 -rotate-6 text-(--tone) opacity-30" strokeWidth={1} />
        </div>
      )}

      {/* Hairline edge, plus a scrim over real photos. Tokens only: ink deepens a photo on light, the page background on dark. */}
      <div
        aria-hidden="true"
        className={clsx(
          'pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-ink/10',
          showImage && 'bg-linear-to-t from-ink/35 via-transparent to-transparent dark:from-bg/60',
        )}
      />

      {children}
    </div>
  );
}
