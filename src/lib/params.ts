import { CATEGORIES, MAX_PAGES } from './categories';
import type { Category } from './types';
export interface Params { page: number; categories: Category[]; q: string; tags: string[] }
export function parseParams(sp: URLSearchParams): Params {
  const raw = parseInt(sp.get('page') ?? '1', 10);
  const page = Math.min(MAX_PAGES, Math.max(1, Number.isNaN(raw) ? 1 : raw));
  const cats = (sp.get('categories') ?? '').split(',').filter((c): c is Category => (CATEGORIES as readonly string[]).includes(c));
  const q = (sp.get('q') ?? '').trim().slice(0, 100);
  const tags = (sp.get('tags') ?? '').split(',').map(t => t.trim().replace(/^#/, '').toLowerCase()).filter(t => /^[a-z0-9_]{1,30}$/.test(t)).slice(0, 10);
  return { page, categories: cats.length ? cats : [...CATEGORIES], q, tags };
}
