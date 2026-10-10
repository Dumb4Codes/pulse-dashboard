import { createHash } from 'node:crypto';
import { MAX_PAGES, PAGE_SIZE } from '../categories';
import { interleave } from '../interleave';
import type { Params } from '../params';
import type { Category, ContentItem, Page } from '../types';
import { mockPage } from './mockProvider';
import { withFallback } from './withFallback';

const API = 'https://newsapi.org/v2';
const TIMEOUT_MS = 8000;

/** NewsAPI has no `finance` category; it is served from `business`. */
const API_CATEGORY: Record<Category, string> = {
  technology: 'technology', sports: 'sports', business: 'business', entertainment: 'entertainment',
  science: 'science', health: 'health', finance: 'business',
};

interface NewsApiArticle {
  title?: string | null; description?: string | null; url?: string | null; urlToImage?: string | null;
  publishedAt?: string | null; author?: string | null; source?: { name?: string | null } | null;
}
interface NewsApiResponse { status?: string; articles?: NewsApiArticle[] }

function isRecord(v: unknown): v is Record<string, unknown> { return typeof v === 'object' && v !== null; }

async function fetchArticles(url: string, key: string): Promise<NewsApiArticle[]> {
  const res = await fetch(url, {
    headers: { 'X-Api-Key': key },
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`NewsAPI HTTP ${res.status}`);
  const json: unknown = await res.json(); // malformed JSON throws -> withFallback serves mock
  if (!isRecord(json) || (json as NewsApiResponse).status !== 'ok') throw new Error('NewsAPI returned a non-ok payload');
  const { articles } = json as NewsApiResponse;
  return Array.isArray(articles) ? articles : [];
}

/**
 * Stable per-article id. A hash of the URL (not a truncated base64 prefix, which would collide for
 * every article from the same host and get them deduped away).
 */
function articleId(url: string): string {
  return `news-${createHash('sha1').update(url).digest('base64url').slice(0, 24)}`;
}

function toItem(a: NewsApiArticle, category: Category): ContentItem | null {
  if (!a.title || a.title === '[Removed]' || !a.url || !a.urlToImage) return null;
  const item: ContentItem = {
    id: articleId(a.url),
    type: 'news',
    category,
    title: a.title,
    description: a.description ?? '',
    image: a.urlToImage,
    url: a.url,
    source: a.source?.name ?? 'NewsAPI',
    publishedAt: a.publishedAt ?? new Date(0).toISOString(),
    score: 50,
  };
  if (a.author) item.author = a.author;
  return item;
}

async function fetchLive(p: Params, key: string): Promise<Page> {
  let lists: ContentItem[][];
  let rawCount: number;

  if (p.q) {
    const url = `${API}/everything?q=${encodeURIComponent(p.q)}&pageSize=${PAGE_SIZE}&page=${p.page}&sortBy=publishedAt&language=en`;
    const articles = await fetchArticles(url, key);
    rawCount = articles.length;
    lists = [articles.map(a => toItem(a, p.categories[0])).filter((i): i is ContentItem => i !== null)];
  } else {
    // One request per distinct upstream category (finance and business share `business`).
    const targets = new Map<string, Category>();
    for (const c of p.categories) if (!targets.has(API_CATEGORY[c])) targets.set(API_CATEGORY[c], c);
    const pageSize = Math.ceil(PAGE_SIZE / targets.size);
    const results = await Promise.all([...targets].map(async ([apiCat, category]) => {
      const url = `${API}/top-headlines?country=us&category=${apiCat}&pageSize=${pageSize}&page=${p.page}`;
      return { category, articles: await fetchArticles(url, key) };
    }));
    rawCount = results.reduce((n, r) => n + r.articles.length, 0);
    lists = results.map(r => r.articles.map(a => toItem(a, r.category)).filter((i): i is ContentItem => i !== null));
  }

  return {
    items: interleave(lists).slice(0, PAGE_SIZE),
    nextPage: rawCount > 0 && p.page < MAX_PAGES ? p.page + 1 : null,
    source: 'live',
  };
}

export function getNews(p: Params): Promise<Page> {
  const key = process.env.NEWS_API_KEY;
  return withFallback(key ? () => fetchLive(p, key) : null, () => mockPage('news', p));
}
