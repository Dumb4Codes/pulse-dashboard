import type { ReactNode } from 'react';

interface PageHeaderProps {
  /** Already-translated page title. Rendered as the page's single `<h1>`. */
  title: string;
  subtitle?: string;
  /** Optional right-aligned controls (filters, counts, buttons). */
  actions?: ReactNode;
}

/**
 * Editorial page heading shared by every dashboard page: Fraunces display title, muted deck,
 * optional actions. Presentational only (no hooks), so server and client pages can both use it.
 */
export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between lg:mb-10">
      <div className="min-w-0">
        <h1 className="font-display text-[clamp(2rem,4.5vw,3.25rem)] font-medium leading-[1.02] tracking-[-0.03em] text-balance">
          {title}
        </h1>
        {subtitle ? <p className="mt-3 max-w-[56ch] text-pretty text-base leading-relaxed text-muted sm:text-lg">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
