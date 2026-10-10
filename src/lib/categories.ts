import type { Category } from './types';
export const CATEGORIES = ['technology','sports','finance','entertainment','science','health','business'] as const satisfies readonly Category[];
export const MAX_PAGES = 5; export const PAGE_SIZE = 9;
