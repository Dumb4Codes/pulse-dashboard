/**
 * "12 Oct 2026" / "12 oct 2026" / "12 अक्तू॰ 2026" for an ISO timestamp, in the active language.
 * Never throws: an unparseable value, the epoch (the movies provider's "no release date" sentinel)
 * or a malformed locale tag yields '' so callers can simply omit the row.
 */
export function formatDate(iso: string, locale: string): string {
  const time = Date.parse(iso);
  if (!Number.isFinite(time) || time <= 0) return '';
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(time);
  } catch {
    return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(time);
  }
}
