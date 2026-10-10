import { createElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  /** A Lucide icon component (`Inbox`) or a ready-made element (an inline illustration). Decorative. */
  icon: LucideIcon | ReactElement;
  /** Already-translated headline; rendered as an `<h2>`. */
  title: string;
  /** Already-translated explanation: why it is empty and what to do next. */
  body?: string;
  /** What the person can do about it (a link or button). */
  action?: ReactNode;
  className?: string;
}

/**
 * "Nothing here" panel: a haloed icon, a Fraunces headline, a short reason and an optional next step.
 * Presentational (no hooks), so server and client pages can both render it. First-run emptiness and
 * filtered-to-nothing emptiness need different copy, so callers always pass the strings in.
 */
export function EmptyState({ icon, title, body, action, className }: EmptyStateProps) {
  return (
    <div className={clsx('mx-auto flex max-w-md animate-rise-sm flex-col items-center px-6 py-14 text-center sm:py-20', className)}>
      <div aria-hidden="true" className="relative mb-7 grid size-24 place-items-center">
        <span className="absolute inset-0 rounded-full border border-dashed border-ink/25" />
        <span className="absolute inset-3 rounded-full bg-surface-2" />
        <span className="relative text-accent-strong">
          {isValidElement(icon) ? icon : createElement(icon, { className: 'size-8', strokeWidth: 1.5 })}
        </span>
      </div>
      <h2 className="font-display text-2xl/[1.2] font-medium tracking-[-0.02em] text-balance">{title}</h2>
      {body ? <p className="mt-2.5 max-w-[42ch] text-pretty text-base leading-relaxed text-muted">{body}</p> : null}
      {action ? <div className="mt-7">{action}</div> : null}
    </div>
  );
}
