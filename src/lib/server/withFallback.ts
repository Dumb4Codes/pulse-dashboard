import type { Page } from '../types';

/**
 * Runs the live provider when one is configured; on ANY failure (HTTP 401/429/500,
 * network error, malformed JSON, timeout...) serves the deterministic mock page instead,
 * flagged `source: 'mock'`. Route handlers therefore never surface an upstream error.
 */
export async function withFallback(live: (() => Promise<Page>) | null, mock: () => Page): Promise<Page> {
  if (!live) return mock();
  try { return await live(); } catch { return { ...mock(), source: 'mock' }; }
}
