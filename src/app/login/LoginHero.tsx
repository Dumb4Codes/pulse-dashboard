'use client';

import type { ReactNode } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { Film, Heart, MessageCircle, Newspaper, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PulseMark } from '@/components/PulseMark';
import { EASE_IN_OUT, EASE_OUT } from '@/lib/motion';

/**
 * Editorial hero for the login screen.
 * Entrance (headline, deck, stats) is pure CSS (`animate-*` utilities from globals.css) so the
 * first paint never waits on hydration. Framer Motion is reserved for the two ambient layers
 * (drifting light + floating sample cards), which are decorative, transform-only and stop under
 * prefers-reduced-motion.
 */

/** Two drifting pools of light. Radial gradients (no blur filter) keep this cheap to paint. */
function AmbientLight({ reduce }: { reduce: boolean }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden forced-colors:hidden">
      <m.div
        className="absolute -right-24 -top-28 size-[26rem] rounded-full bg-[radial-gradient(closest-side,var(--accent),transparent)] opacity-30 lg:size-[34rem] dark:opacity-25"
        animate={reduce ? undefined : { x: [0, -36, 18, 0], y: [0, 28, -16, 0], scale: [1, 1.07, 0.97, 1] }}
        transition={{ duration: 22, ease: EASE_IN_OUT, repeat: Infinity }}
      />
      <m.div
        className="absolute -bottom-36 -left-28 size-[28rem] rounded-full bg-[radial-gradient(closest-side,var(--accent-2),transparent)] opacity-25 lg:size-[38rem] dark:opacity-30"
        animate={reduce ? undefined : { x: [0, 30, -22, 0], y: [0, -24, 14, 0], scale: [1, 0.96, 1.06, 1] }}
        transition={{ duration: 28, ease: EASE_IN_OUT, repeat: Infinity }}
      />
    </div>
  );
}

interface FloatingCardProps {
  className: string;
  enterDelay: number;
  floatDistance: number;
  floatDuration: number;
  reduce: boolean;
  children: ReactNode;
}

/** Outer element handles the entrance, inner element the idle float, so the two never fight over `transform`. */
function FloatingCard({ className, enterDelay, floatDistance, floatDuration, reduce, children }: FloatingCardProps) {
  return (
    <m.div
      className={`absolute ${className}`}
      initial={reduce ? false : { opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: EASE_OUT, delay: enterDelay }}
    >
      <m.div
        animate={reduce ? undefined : { y: [0, -floatDistance, 0] }}
        transition={{ duration: floatDuration, ease: EASE_IN_OUT, repeat: Infinity, delay: enterDelay + 0.8 }}
        className="rounded-card border border-line bg-surface p-3 shadow-[var(--shadow)]"
      >
        {children}
      </m.div>
    </m.div>
  );
}

function SampleCards({ reduce }: { reduce: boolean }) {
  const { t } = useTranslation();
  return (
    <div aria-hidden="true" className="relative mt-2 hidden h-[15rem] lg:block xl:h-[17rem]">
      <FloatingCard className="left-0 top-10 hidden w-[11.5rem] -rotate-3 xl:block" enterDelay={0.55} floatDistance={7} floatDuration={8} reduce={reduce}>
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.12em] text-muted">
          <Newspaper className="size-3.5" /> {t('category.technology')}
        </p>
        <p className="mt-2 font-display text-lg font-medium leading-snug tracking-tight">
          {t('hero.sample.newsHeadline')}
        </p>
        <p className="mt-3 text-xs text-muted">{t('hero.sample.newsMeta')}</p>
      </FloatingCard>

      <FloatingCard className="left-0 top-0 w-[13rem] rotate-2 xl:left-[calc(50%-6.5rem)]" enterDelay={0.7} floatDistance={9} floatDuration={9.5} reduce={reduce}>
        <div className="relative flex h-24 items-end justify-between rounded-md bg-linear-to-br/oklab from-accent to-accent-2 p-2.5">
          <Film className="size-5 text-[var(--accent-ink)]" />
          <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-xs font-medium tabular-nums text-ink">
            <Star className="size-3 fill-current text-accent" /> 8.4
          </span>
        </div>
        <p className="mt-2.5 font-display text-lg font-medium leading-tight tracking-tight">{t('hero.sample.movieTitle')}</p>
        <p className="mt-1 text-xs text-muted">{t('hero.sample.movieMeta')}</p>
      </FloatingCard>

      <FloatingCard className="right-0 top-20 z-10 w-[13.5rem] -rotate-1 xl:top-[6.5rem]" enterDelay={0.85} floatDistance={6} floatDuration={7.5} reduce={reduce}>
        <div className="flex items-center gap-2">
          <span className="size-7 rounded-full bg-linear-to-br/oklab from-accent-2 to-accent" />
          <span className="text-sm font-medium">@mira.codes</span>
        </div>
        <p className="mt-2 text-sm leading-snug text-ink/80">{t('hero.sample.postBody')}</p>
        <p className="mt-3 flex items-center gap-4 text-xs tabular-nums text-muted">
          <span className="inline-flex items-center gap-1"><Heart className="size-3.5" /> 1.2k</span>
          <span className="inline-flex items-center gap-1"><MessageCircle className="size-3.5" /> 48</span>
        </p>
      </FloatingCard>
    </div>
  );
}

export function LoginHero() {
  const { t } = useTranslation();
  const reduce = useReducedMotion() ?? false;
  const stats = [
    { label: t('hero.stats.sources'), value: '3' },
    { label: t('hero.stats.topics'), value: '7' },
    { label: t('hero.stats.languages'), value: '3' },
  ];

  return (
    <section
      aria-label={t('hero.about')}
      className="relative isolate flex flex-col overflow-hidden rounded-[calc(var(--radius)+10px)] border border-line bg-surface-2 p-6 sm:p-10 lg:p-10 xl:p-12"
    >
      <AmbientLight reduce={reduce} />

      <header className="flex items-center justify-between animate-rise-sm">
        <div className="flex items-center gap-2.5">
          <PulseMark className="size-8" />
          <span className="font-display text-2xl font-medium tracking-tight">Pulse</span>
        </div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink/70">{t('hero.edition')}</p>
      </header>

      <div className="flex flex-1 flex-col justify-center py-8 sm:py-14 lg:py-6">
        <p className="font-display text-[clamp(2.75rem,11vw,4.5rem)] font-medium leading-[0.95] tracking-[-0.035em] text-balance lg:text-[clamp(3.5rem,6vw,6.5rem)]">
          <span className="-mb-[0.14em] block overflow-hidden pb-[0.14em]">
            <span className="inline-block animate-mask-up [animation-delay:120ms]">{t('hero.tagline')}</span>
          </span>{' '}
          <span className="-mb-[0.14em] block overflow-hidden pb-[0.14em]">
            {/* text-danger (coral at 68% toward ink), not accent-strong: on a phone the ambient glow sits right behind this line and accent-strong dipped to 2.8:1 (large text needs 3:1). */}
            <span className="relative inline-block animate-mask-up text-danger [animation-delay:240ms]">
              {t('hero.taglineAccent')}
              <svg
                viewBox="0 0 280 10"
                preserveAspectRatio="none"
                aria-hidden="true"
                className="absolute -bottom-[0.04em] left-0 h-[0.14em] w-full overflow-visible"
              >
                <path
                  d="M3 6 C 42 0, 74 10, 116 5 S 196 0, 277 6"
                  pathLength={1}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray={1}
                  className="animate-draw [animation-delay:900ms]"
                />
              </svg>
            </span>
          </span>
        </p>
        <p className="mt-6 hidden max-w-[40ch] animate-rise-sm text-pretty text-lg leading-relaxed text-ink/75 [animation-delay:420ms] sm:block">
          {t('hero.deck')}
        </p>
      </div>

      <SampleCards reduce={reduce} />

      <dl className="mt-6 hidden grid-cols-3 gap-4 border-t border-line pt-5 animate-rise-sm [animation-delay:560ms] [@media(min-width:640px)_and_(min-height:801px)]:grid">
        {stats.map((stat) => (
          <div key={stat.label}>
            <dt className="text-xs font-medium uppercase tracking-[0.14em] text-ink/70">{stat.label}</dt>
            <dd className="mt-1 font-display text-3xl font-medium tabular-nums tracking-tight">{stat.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
