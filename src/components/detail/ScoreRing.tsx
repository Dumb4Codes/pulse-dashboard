'use client';

import { useTranslation } from 'react-i18next';

interface ScoreRingProps {
  /** 0-100; anything outside is clamped. */
  score: number;
}

/**
 * The item's trending score as a ring that draws itself in (the shared `draw` keyframe, which
 * reduced motion collapses to the finished ring). Announced as a `meter` with a plain-language value;
 * the glyphs and the SVG are decorative. The dash is `value 10` (not `value 1`) so the pattern never
 * repeats inside the path while the keyframe slides its offset from 1 to 0.
 */
export function ScoreRing({ score }: ScoreRingProps) {
  const { t } = useTranslation();
  const value = Math.round(Math.min(100, Math.max(0, Number.isFinite(score) ? score : 0)));

  return (
    <div
      role="meter"
      aria-label={t('detail.score')}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-valuetext={t('detail.scoreOf', { score: value })}
      className="relative size-32 shrink-0"
    >
      <svg viewBox="0 0 120 120" fill="none" aria-hidden="true" className="size-full -rotate-90">
        <circle cx="60" cy="60" r="52" strokeWidth="9" className="stroke-line" />
        <circle
          cx="60"
          cy="60"
          r="52"
          pathLength={1}
          strokeDasharray={`${value / 100} 10`}
          strokeWidth="9"
          strokeLinecap="round"
          className="animate-draw stroke-(--tone) [animation-delay:350ms]"
        />
      </svg>
      <span aria-hidden="true" className="absolute inset-0 grid place-content-center text-center">
        <span className="font-display text-4xl/none font-medium tabular-nums tracking-[-0.03em]">{value}</span>
        <span className="mt-1 text-xs text-muted">/ 100</span>
      </span>
    </div>
  );
}
