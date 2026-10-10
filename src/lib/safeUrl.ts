/**
 * Content URLs come from third-party APIs. Only plain web URLs are ever rendered as a link target or
 * an image source, which blocks `javascript:` and `data:` payloads. Returns the trimmed URL, or null.
 */
export function safeHttpUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const { protocol } = new URL(trimmed);
    return protocol === 'https:' || protocol === 'http:' ? trimmed : null;
  } catch {
    return null;
  }
}
