import { MAX_PAGES, PAGE_SIZE } from '../categories';
import type { Params } from '../params';
import type { Category, ContentItem, Page } from '../types';
import { mockPage } from './mockProvider';
import { withFallback } from './withFallback';

const API = 'https://api.themoviedb.org/3';
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w780';
const TIMEOUT_MS = 8000;

/** TMDB genre ids per Pulse category. */
const GENRES: Record<Category, number[]> = {
  technology: [878], science: [878], sports: [99], finance: [18], business: [18], entertainment: [35, 12], health: [10751],
};

interface TmdbMovie {
  id?: number; title?: string | null; overview?: string | null; poster_path?: string | null;
  release_date?: string | null; vote_average?: number | null; genre_ids?: number[] | null;
}
interface TmdbResponse { results?: TmdbMovie[]; total_pages?: number }

function isRecord(v: unknown): v is Record<string, unknown> { return typeof v === 'object' && v !== null; }

function toItem(m: TmdbMovie, selected: Category[]): ContentItem | null {
  if (typeof m.id !== 'number' || !m.title || !m.poster_path) return null;
  const firstGenre = m.genre_ids?.[0];
  const category = selected.find(c => firstGenre !== undefined && GENRES[c].includes(firstGenre)) ?? 'entertainment';
  const released = m.release_date ? new Date(m.release_date) : null;
  return {
    id: `movie-${m.id}`,
    type: 'movie',
    category,
    title: m.title,
    description: m.overview ?? '',
    image: `${IMAGE_BASE}${m.poster_path}`,
    url: `https://www.themoviedb.org/movie/${m.id}`,
    source: 'TMDB',
    publishedAt: (released && !Number.isNaN(released.getTime()) ? released : new Date(0)).toISOString(),
    score: Math.round((m.vote_average ?? 0) * 10),
  };
}

async function fetchLive(p: Params, key: string): Promise<Page> {
  // `|` = OR in TMDB's with_genres (a comma would mean AND, which matches almost nothing).
  const genres = [...new Set(p.categories.flatMap(c => GENRES[c]))].join('|');
  const url = p.q
    ? `${API}/search/movie?query=${encodeURIComponent(p.q)}&page=${p.page}`
    : `${API}/discover/movie?with_genres=${encodeURIComponent(genres)}&page=${p.page}&sort_by=popularity.desc`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`TMDB HTTP ${res.status}`);
  const json: unknown = await res.json(); // malformed JSON throws -> withFallback serves mock
  if (!isRecord(json) || !Array.isArray((json as TmdbResponse).results)) throw new Error('TMDB returned an unexpected payload');
  const { results = [], total_pages: totalPages } = json as TmdbResponse;
  const items = results.map(m => toItem(m, p.categories)).filter((i): i is ContentItem => i !== null).slice(0, PAGE_SIZE);
  const lastPage = Math.min(MAX_PAGES, typeof totalPages === 'number' ? totalPages : MAX_PAGES);
  return { items, nextPage: results.length > 0 && p.page < lastPage ? p.page + 1 : null, source: 'live' };
}

export function getMovies(p: Params): Promise<Page> {
  const key = process.env.TMDB_API_KEY;
  return withFallback(key ? () => fetchLive(p, key) : null, () => mockPage('movie', p));
}
