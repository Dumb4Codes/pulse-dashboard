import type { Params } from '../params';
import type { Page } from '../types';
import { mockPage } from './mockProvider';

/**
 * Social content is intentionally mock-only: there is no free public API that returns a
 * hashtag-filterable feed without per-user OAuth. Kept async so it is interchangeable with
 * the news/movies providers.
 */
export function getSocial(p: Params): Promise<Page> {
  return Promise.resolve(mockPage('social', p));
}
