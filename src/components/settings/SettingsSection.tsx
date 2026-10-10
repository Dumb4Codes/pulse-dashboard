import type { ReactNode } from 'react';
import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import { Numeral } from '../Numeral';

interface SettingsSectionProps {
  /** 1-based section number, drawn as a ghost outline numeral in the corner ("01"). */
  index: number;
  icon: LucideIcon;
  /** Already-translated heading (an `<h2>`). */
  title: string;
  /** Already-translated one-line explanation. */
  body: string;
  /** Id for the heading, so the section and any group inside it can be labelled by it. */
  headingId: string;
  className?: string;
  children: ReactNode;
}

/**
 * One settings card: tone icon, Fraunces heading, a line of context, then the controls. The big
 * numeral in the corner is decoration (`aria-hidden`); the section is a labelled landmark-ish
 * region via `aria-labelledby`. Presentational, so it renders on the server too.
 */
export function SettingsSection({ index, icon: Icon, title, body, headingId, className, children }: SettingsSectionProps) {
  return (
    <section
      aria-labelledby={headingId}
      className={clsx(
        'relative overflow-hidden rounded-card border border-line bg-surface p-5 shadow-[0_1px_0_color-mix(in_oklab,var(--ink)_6%,transparent)] sm:p-7',
        className,
      )}
    >
      <Numeral className="pointer-events-none absolute right-5 top-4 text-[3.5rem] opacity-50 sm:right-7 sm:top-5 sm:text-6xl">
        {String(index).padStart(2, '0')}
      </Numeral>

      <header className="mb-6 flex items-start gap-4 pr-16 sm:pr-20">
        <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-2xl bg-surface-2 text-accent-strong">
          <Icon className="size-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <h2
            id={headingId}
            className="text-balance font-display text-2xl/[1.2] font-medium tracking-[-0.02em] [:lang(hi)_&]:leading-normal"
          >
            {title}
          </h2>
          <p className="mt-1.5 max-w-[52ch] text-pretty text-[0.9375rem] leading-relaxed text-muted">{body}</p>
        </div>
      </header>

      {children}
    </section>
  );
}
