/** Where an item's details page lives. Ids are opaque API strings, so they are always encoded. */
export function contentHref(id: string): string {
  return `/content/${encodeURIComponent(id)}`;
}

/** Reads the `[id]` route param back into an item id. Never throws on a malformed escape. */
export function readContentId(param: string | string[] | undefined): string {
  const raw = Array.isArray(param) ? (param[0] ?? '') : (param ?? '');
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
