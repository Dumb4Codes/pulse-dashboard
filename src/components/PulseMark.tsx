/** Pulse logo tile: coral rounded square with a heartbeat line. Decorative; pair it with the "Pulse" wordmark. */
export function PulseMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className={className}>
      <rect width="32" height="32" rx="9" fill="var(--accent)" />
      <path
        d="M5 17.5h5.2l3-8.5 4.6 15 3.2-6.5H27"
        stroke="var(--accent-ink)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Small "live" indicator: solid coral dot with a slow expanding halo (`animate-pulse-ring`, stops
 * under reduced motion). Purely decorative; always accompanied by a text label.
 */
export function PulseDot({ className = '' }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`relative inline-flex size-2.5 shrink-0 ${className}`}>
      <span className="absolute inset-0 rounded-full bg-accent opacity-0 animate-pulse-ring" />
      <span className="relative size-2.5 rounded-full bg-accent" />
    </span>
  );
}
