/** Largest-first; a timestamp uses the first unit it is at least one whole step of. */
const UNITS: ReadonlyArray<readonly [Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 365 * 86_400],
  ['month', 30 * 86_400],
  ['week', 7 * 86_400],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
];

/** Anything up to this far in the future is client/server clock skew, not a genuine upcoming date. */
const SKEW_TOLERANCE_SECONDS = 3_600;

const formatters = new Map<string, Intl.RelativeTimeFormat>();

function formatterFor(locale: string): Intl.RelativeTimeFormat {
  const cached = formatters.get(locale);
  if (cached) return cached;
  let formatter: Intl.RelativeTimeFormat;
  try {
    formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  } catch {
    // A malformed locale tag throws RangeError; English is always a safe answer.
    formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  }
  formatters.set(locale, formatter);
  return formatter;
}

/**
 * "3 hours ago" / "hace 3 horas" / "3 घंटे पहले" for an ISO timestamp, via `Intl.RelativeTimeFormat`
 * in the active language. Never throws: an unparseable value, or the epoch (the movies provider's
 * "no release date" sentinel), yields '' so callers can simply omit the date.
 */
export function formatRelativeTime(iso: string, locale: string, now: number = Date.now()): string {
  const time = Date.parse(iso);
  if (!Number.isFinite(time) || time <= 0) return '';

  let seconds = Math.round((time - now) / 1000); // negative = in the past
  if (seconds > 0 && seconds < SKEW_TOLERANCE_SECONDS) seconds = 0;

  const formatter = formatterFor(locale);
  const magnitude = Math.abs(seconds);
  for (const [unit, size] of UNITS) {
    if (magnitude >= size) return formatter.format(Math.trunc(seconds / size), unit);
  }
  return formatter.format(0, 'second');
}
