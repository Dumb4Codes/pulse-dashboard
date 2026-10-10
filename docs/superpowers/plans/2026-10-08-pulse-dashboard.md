# Pulse Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build "Pulse", a Next.js personalized content dashboard (news + movies + social in one searchable, re-orderable, themeable feed) that meets every requirement of the SDE Intern Frontend Assignment PDF.

**Architecture:** Next.js App Router. Route handlers (`/api/*`) call real NewsAPI/TMDB when keys exist, else serve seeded mock data, and always return a normalized `Page` of `ContentItem`s. Client uses Redux Toolkit slices (preferences, favorites, feedOrder, session, live) persisted to localStorage, plus RTK Query for paginated fetching. UI is Tailwind v4 over CSS-variable design tokens with Framer Motion for animation and drag-reorder.

**Tech Stack:** Next.js (latest), React 19, TypeScript strict, Redux Toolkit/RTK Query, Tailwind CSS v4, Framer Motion, react-i18next, Vitest + React Testing Library + MSW, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-08-pulse-dashboard-design.md`

**NO GIT:** The user forbade git operations. Plan has no commit steps; each task ends with a **Checkpoint** (tests + typecheck green). Never run `git` commands.

## Global Constraints
- TypeScript `strict: true`; no `any` in `src/` (tests may cast).
- Path alias `@/*` → `src/*`.
- API keys only via `process.env.NEWS_API_KEY`, `process.env.TMDB_API_KEY`, `AUTH_SECRET` read in server code only; never `NEXT_PUBLIC_*`.
- Page size = 9 items per source; max page = 5.
- Categories (exact): `technology, sports, finance, entertainment, science, health, business`.
- localStorage key (exact): `pulse:v1`. Cookie name (exact): `pulse_session`.
- Languages: `en`, `hi`, `es`. Themes: `light`, `dark`, `system`.
- Demo credentials (exact): `demo@pulse.dev` / `pulse123`.
- Debounce delay for search: 300 ms. SSE default interval: 20 s (`?interval=` seconds, clamped 1–60).
- All animation must be disabled/neutralised under `prefers-reduced-motion`.
- WCAG AA contrast, visible focus ring on every interactive element, semantic landmarks, skip link.
- Tailwind v4: dark variant defined as `@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));` (replaces the spec's v3 `darkMode` config; same intent).
- Card images use a plain `<img loading="lazy" referrerpolicy="no-referrer">` with onError gradient fallback (NewsAPI image hosts are arbitrary, so `next/image` allow-listing is impossible) — deliberate deviation from the spec's `next/image` line.

## Review Focus
1. localStorage unavailable, throws, or holds corrupt/old-version JSON → app still loads with defaults, never crashes (Task 4).
2. User un-selects the last category → blocked; feed never has zero categories (Task 4).
3. Upstream API returns 401/429/500/network error/malformed JSON → route returns mock page with `source:'mock'`, never 500 (Task 3).
4. Search input whitespace-only, 1 char, 500 chars, regex/HTML characters → no request below 2 chars, clamped to 100, rendered text escaped (Tasks 2, 3, 10).
5. Same item appears on two pages, or a favorited/ordered item is no longer returned by the API → feed dedupes; Favorites still shows the saved snapshot; ordering ignores unknown ids (Tasks 2, 4, 8).

## File Structure
```
package.json, next.config.ts, middleware.ts, vitest.config.ts, playwright.config.ts
.env.example, README.md
src/app/{layout.tsx,providers.tsx,globals.css}
src/app/login/page.tsx
src/app/(dashboard)/{layout.tsx,page.tsx,trending/page.tsx,favorites/page.tsx,settings/page.tsx}
src/app/api/{news,movies,social,search,stream}/route.ts
src/app/api/auth/{login,logout,session}/route.ts
src/lib/{types.ts,interleave.ts,order.ts,useDebouncedValue.ts,params.ts,auth.ts,i18n.ts,categories.ts}
src/lib/server/{withFallback.ts,mockData.ts,mockProvider.ts,newsProvider.ts,moviesProvider.ts,socialProvider.ts}
src/locales/{en,hi,es}.json
src/store/{index.ts,hooks.ts,persist.ts,api.ts,actions.ts}
src/store/slices/{preferences,favorites,feedOrder,session,live}.ts
src/components/{ThemeSync,StoreHydrator,Sidebar,Header,ThemeToggle,LanguageSwitch,AccountMenu,SearchPalette,ContentCard,CardImage,FavoriteButton,Skeleton,EmptyState,ErrorState,SortableFeed,NewItemsPill,CategoryChips,PageHeader}.tsx
src/hooks/{useFeed.ts,useLiveFeed.ts,useInfiniteSentinel.ts}
tests/setup.ts, tests/helpers.tsx, tests/msw.ts
tests/unit/*.test.ts(x)  tests/integration/*.test.tsx   e2e/*.spec.ts
```

---

### Task 1: Scaffold, tooling, design tokens

**Files:** Create everything in "File Structure" config group; `src/app/globals.css`, `src/app/layout.tsx`, `.env.example`, `.gitignore` (plain file only — no git commands), `vitest.config.ts`, `tests/setup.ts`, `playwright.config.ts`.

**Interfaces — Produces:** npm scripts `dev, build, start, lint, typecheck, test, test:watch, e2e`; CSS tokens used by all UI tasks; `@/*` alias.

- [ ] **Step 1: Scaffold.** In `C:\Users\HimanshuVerma\Desktop\Intern\pulse-dashboard` (contains only `docs/`):
  `npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes --skip-git` (flag `--skip-git` is required; if it refuses because `docs/` exists, scaffold into `_tmp` and move files up, keeping `docs/`).
- [ ] **Step 2: Install deps.**
  `npm i @reduxjs/toolkit react-redux framer-motion react-i18next i18next lucide-react clsx`
  `npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event msw @playwright/test`
  `npx playwright install chromium`
- [ ] **Step 3: Scripts** in package.json: `"typecheck":"tsc --noEmit","test":"vitest run","test:watch":"vitest","e2e":"playwright test"`.
- [ ] **Step 4: `vitest.config.ts`**
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: {
    environment: 'jsdom',
    environmentOptions: { jsdom: { url: 'http://localhost:3000' } },
    setupFiles: ['tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    css: false,
  },
});
```
- [ ] **Step 5: `tests/setup.ts`**
```ts
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
afterEach(() => { cleanup(); localStorage.clear(); });
// jsdom lacks these:
class IO { observe(){} unobserve(){} disconnect(){} takeRecords(){return []} }
(globalThis as any).IntersectionObserver ??= IO;
window.matchMedia ??= ((q: string) => ({ matches:false, media:q, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){}, onchange:null, dispatchEvent(){return false} })) as any;
```
- [ ] **Step 6: Design tokens in `src/app/globals.css`** (replace scaffold). Required content:
  - `@import "tailwindcss";` + the `@custom-variant dark` line from Global Constraints.
  - `:root` (light) tokens: `--bg:#FAF6EE; --surface:#FFFFFF; --surface-2:#F3EDE0; --ink:#16181D; --muted:#5B6070; --line:#E4DCCB; --accent:#E8452C; --accent-2:#5B4BFF; --accent-ink:#FFFFFF; --ring:#5B4BFF; --radius:18px; --shadow:0 10px 30px -12px rgba(22,24,29,.25)`.
  - `[data-theme="dark"]` tokens: `--bg:#0B1020; --surface:#131A2E; --surface-2:#1A2340; --ink:#EEF1FA; --muted:#A3ABC4; --line:#26304F; --accent:#FF6B52; --accent-2:#8B7DFF; --accent-ink:#0B1020; --ring:#A99FFF; --shadow:0 14px 34px -14px rgba(0,0,0,.7)`.
  - `@theme inline { --color-bg:var(--bg); --color-surface:var(--surface); --color-surface-2:var(--surface-2); --color-ink:var(--ink); --color-muted:var(--muted); --color-line:var(--line); --color-accent:var(--accent); --color-accent-2:var(--accent-2); --font-display:var(--font-fraunces); --font-sans:var(--font-inter); --radius-card:var(--radius); }`
  - base: `body{background:var(--bg);color:var(--ink);font-family:var(--font-inter)}`, subtle grain via `body::before` radial-noise SVG data-URI at 4% opacity (pointer-events none), `:focus-visible{outline:3px solid var(--ring);outline-offset:2px}`, `.skeleton` shimmer keyframes, `@media (prefers-reduced-motion: reduce){*{animation-duration:.01ms!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}`.
- [ ] **Step 7: `src/app/layout.tsx`.** Load `Fraunces` and `Inter` via `next/font/google` (variables `--font-fraunces`, `--font-inter`); `<html lang="en" suppressHydrationWarning>`; inline no-flash `<script>` in `<head>`:
```js
try{var s=JSON.parse(localStorage.getItem('pulse:v1')||'{}');var t=(s.preferences&&s.preferences.theme)||'system';
var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);
document.documentElement.dataset.theme=d?'dark':'light';}catch(e){document.documentElement.dataset.theme='light'}
```
  Wrap children in `<Providers>` (Task 6 creates it; stub `providers.tsx` returning children now). Metadata title "Pulse — your personalized feed".
- [ ] **Step 8: `.env.example`** with `NEWS_API_KEY=`, `TMDB_API_KEY=`, `AUTH_SECRET=change-me-to-a-long-random-string` and comments that blanks enable mock mode. Create `.gitignore` entries `.env*.local`, `node_modules`, `.next`, `test-results`, `playwright-report`.
- [ ] **Step 9: `playwright.config.ts`** — `webServer: { command:'npm run build && npm run start', url:'http://localhost:3000', reuseExistingServer:true, env:{AUTH_SECRET:'e2e-secret-e2e-secret-e2e-secret'} }`, `testDir:'e2e'`, project chromium, `use:{baseURL:'http://localhost:3000', trace:'retain-on-failure'}`. (Dev-server alternative: `npm run dev` for speed.)
- [ ] **Step 10: Checkpoint.** `npm run typecheck && npm run lint && npm run build` pass.

---

### Task 2: Domain types and pure helpers (TDD)

**Files:** Create `src/lib/{types.ts,categories.ts,interleave.ts,order.ts,useDebouncedValue.ts,params.ts}`; Test `tests/unit/{interleave,order,debounce,params}.test.ts(x)`.

**Interfaces — Produces:**
```ts
// types.ts
export type ContentType = 'news' | 'movie' | 'social';
export type Category = 'technology'|'sports'|'finance'|'entertainment'|'science'|'health'|'business';
export interface ContentItem { id:string; type:ContentType; category:Category; title:string; description:string; image:string; url:string; source:string; author?:string; publishedAt:string; score:number; }
export interface Page { items: ContentItem[]; nextPage: number | null; source: 'live' | 'mock'; }
// categories.ts
export const CATEGORIES: readonly Category[]; export const MAX_PAGES = 5; export const PAGE_SIZE = 9;
// interleave.ts
export function interleave<T extends {id:string}>(lists: T[][]): T[]
// order.ts
export function applyOrder<T extends {id:string}>(items: T[], order: string[]): T[]
// useDebouncedValue.ts
export function useDebouncedValue<T>(value: T, delay = 300): T
// params.ts
export interface Params { page:number; categories:Category[]; q:string; tags:string[] }
export function parseParams(sp: URLSearchParams): Params
```

- [ ] **Step 1: Write failing tests.**
```ts
// tests/unit/interleave.test.ts
import { interleave } from '@/lib/interleave';
const mk = (...ids: string[]) => ids.map(id => ({ id }));
describe('interleave', () => {
  it('round-robins lists', () => expect(interleave([mk('a1','a2'), mk('b1','b2')]).map(i=>i.id)).toEqual(['a1','b1','a2','b2']));
  it('handles uneven + empty lists', () => expect(interleave([mk('a1','a2','a3'), [], mk('c1')]).map(i=>i.id)).toEqual(['a1','c1','a2','a3']));
  it('dedupes by id (same item on two pages)', () => expect(interleave([mk('x','y'), mk('x')]).map(i=>i.id)).toEqual(['x','y']));
  it('returns [] for no input', () => expect(interleave([])).toEqual([]));
});
// tests/unit/order.test.ts
import { applyOrder } from '@/lib/order';
const mk = (...ids: string[]) => ids.map(id => ({ id }));
describe('applyOrder', () => {
  it('sorts known ids by saved order, appends unknown in natural order', () =>
    expect(applyOrder(mk('a','b','c','d'), ['c','a']).map(i=>i.id)).toEqual(['c','a','b','d']));
  it('ignores saved ids that are no longer present', () =>
    expect(applyOrder(mk('a','b'), ['zzz','b']).map(i=>i.id)).toEqual(['b','a']));
  it('empty order keeps natural order', () => expect(applyOrder(mk('a','b'), []).map(i=>i.id)).toEqual(['a','b']));
});
// tests/unit/debounce.test.tsx
import { renderHook, act } from '@testing-library/react';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
describe('useDebouncedValue', () => {
  beforeEach(() => vi.useFakeTimers()); afterEach(() => vi.useRealTimers());
  it('only emits the last value after the delay', () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 300), { initialProps: { v: 'a' } });
    rerender({ v: 'ab' }); rerender({ v: 'abc' });
    expect(result.current).toBe('a');
    act(() => { vi.advanceTimersByTime(299); }); expect(result.current).toBe('a');
    act(() => { vi.advanceTimersByTime(1); });   expect(result.current).toBe('abc');
  });
});
// tests/unit/params.test.ts
import { parseParams } from '@/lib/params';
const p = (s: string) => parseParams(new URLSearchParams(s));
describe('parseParams', () => {
  it('defaults', () => expect(p('')).toMatchObject({ page: 1, q: '', tags: [] }));
  it('clamps page to 1..5 and survives NaN', () => { expect(p('page=99').page).toBe(5); expect(p('page=-3').page).toBe(1); expect(p('page=abc').page).toBe(1); });
  it('keeps only valid categories; empty falls back to all 7', () => { expect(p('categories=sports,evil,tech').categories).toEqual(['sports']); expect(p('categories=nope').categories).toHaveLength(7); });
  it('trims and clamps q to 100 chars', () => { expect(p('q=%20%20hi%20').q).toBe('hi'); expect(p('q=' + 'x'.repeat(500)).q).toHaveLength(100); });
  it('sanitises hashtags', () => expect(p('tags=%23Tech,<script>,ok_1').tags).toEqual(['tech', 'ok_1']));
});
```
- [ ] **Step 2: Run** `npx vitest run tests/unit` → FAIL (modules missing).
- [ ] **Step 3: Implement.**
```ts
// categories.ts
import type { Category } from './types';
export const CATEGORIES = ['technology','sports','finance','entertainment','science','health','business'] as const satisfies readonly Category[];
export const MAX_PAGES = 5; export const PAGE_SIZE = 9;
// interleave.ts
export function interleave<T extends { id: string }>(lists: T[][]): T[] {
  const out: T[] = []; const seen = new Set<string>();
  const max = Math.max(0, ...lists.map(l => l.length));
  for (let i = 0; i < max; i++) for (const l of lists) { const it = l[i]; if (it && !seen.has(it.id)) { seen.add(it.id); out.push(it); } }
  return out;
}
// order.ts
export function applyOrder<T extends { id: string }>(items: T[], order: string[]): T[] {
  const rank = new Map(order.map((id, i) => [id, i]));
  const known = items.filter(i => rank.has(i.id)).sort((a, b) => rank.get(a.id)! - rank.get(b.id)!);
  return [...known, ...items.filter(i => !rank.has(i.id))];
}
// useDebouncedValue.ts
import { useEffect, useState } from 'react';
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return v;
}
// params.ts
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
```
- [ ] **Step 4: Run** `npx vitest run tests/unit` → PASS.
- [ ] **Step 5: Checkpoint.** `npm run typecheck` green.

---

### Task 3: Server providers, mock data, API routes (TDD)

**Files:** Create `src/lib/server/{withFallback.ts,mockData.ts,mockProvider.ts,newsProvider.ts,moviesProvider.ts,socialProvider.ts}`, `src/app/api/{news,movies,social,search}/route.ts`; Test `tests/unit/{withFallback,mockProvider,newsProvider}.test.ts`.

**Interfaces — Consumes:** Task 2 types, `parseParams`, `PAGE_SIZE`, `MAX_PAGES`. **Produces:**
```ts
// withFallback.ts
export async function withFallback(live: (() => Promise<Page>) | null, mock: () => Page): Promise<Page> // live fails → {...mock(), source:'mock'}
// mockProvider.ts
export function mockPage(type: ContentType, p: Params): Page   // deterministic, filtered by categories/q/tags, 9 per page, nextPage null after page 5 or end
// *Provider.ts
export function getNews(p: Params): Promise<Page>; getMovies(p: Params): Promise<Page>; getSocial(p: Params): Promise<Page>
```
Route contract: `GET /api/{news|movies|social}?categories=a,b&page=1&q=&tags=` → `200 Page` JSON with header `X-Data-Source: live|mock`; `GET /api/search?q=` → `200 { news: ContentItem[], movies: ContentItem[], social: ContentItem[] }` (top 5 each; `q` < 2 chars → all empty arrays).

- [ ] **Step 1: Failing tests.**
```ts
// tests/unit/withFallback.test.ts
import { withFallback } from '@/lib/server/withFallback';
const mock = () => ({ items: [], nextPage: null, source: 'mock' as const });
const live = { items: [], nextPage: 2, source: 'live' as const };
it('uses mock when no live provider', async () => expect((await withFallback(null, mock)).source).toBe('mock'));
it('returns live when it succeeds', async () => expect((await withFallback(async () => live, mock)).source).toBe('live'));
it.each(['401','429','500','network','bad json'])('falls back on %s', async (m) =>
  expect((await withFallback(async () => { throw new Error(m); }, mock)).source).toBe('mock'));
// tests/unit/mockProvider.test.ts
import { mockPage } from '@/lib/server/mockProvider';
import { parseParams } from '@/lib/params';
const P = (s = '') => parseParams(new URLSearchParams(s));
it('returns 9 items on page 1 for every type', () => (['news','movie','social'] as const).forEach(t => expect(mockPage(t, P()).items).toHaveLength(9)));
it('is deterministic', () => expect(mockPage('news', P('page=2'))).toEqual(mockPage('news', P('page=2'))));
it('filters by category', () => mockPage('news', P('categories=sports')).items.forEach(i => expect(i.category).toBe('sports')));
it('filters by q (case-insensitive) and returns [] with nextPage null when nothing matches', () => {
  const r = mockPage('news', P('q=zzzzqqq')); expect(r.items).toEqual([]); expect(r.nextPage).toBeNull(); });
it('social filters by tag', () => mockPage('social', P('tags=tech')).items.forEach(i => expect(i.description.toLowerCase()).toContain('#tech')));
it('paginates to a finite end', () => expect(mockPage('news', P('page=5')).nextPage).toBeNull());
it('ids are unique across pages', () => { const ids = [1,2,3].flatMap(n => mockPage('news', P(`page=${n}`)).items.map(i => i.id)); expect(new Set(ids).size).toBe(ids.length); });
// tests/unit/newsProvider.test.ts  — stub global fetch
import { getNews } from '@/lib/server/newsProvider';
import { parseParams } from '@/lib/params';
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it('uses mock when NEWS_API_KEY is absent', async () => { vi.stubEnv('NEWS_API_KEY', ''); expect((await getNews(parseParams(new URLSearchParams()))).source).toBe('mock'); });
it('maps NewsAPI articles to ContentItem', async () => {
  vi.stubEnv('NEWS_API_KEY', 'k');
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ status:'ok', totalResults:1, articles:[{ title:'T', description:'D', url:'https://x.test/a', urlToImage:'https://x.test/i.jpg', publishedAt:'2026-01-01T00:00:00Z', source:{ name:'S' }, author:'A' }] }))));
  const r = await getNews(parseParams(new URLSearchParams('categories=sports')));
  expect(r.source).toBe('live'); expect(r.items[0]).toMatchObject({ type:'news', category:'sports', title:'T', source:'S' });
});
it('falls back to mock on HTTP 429', async () => {
  vi.stubEnv('NEWS_API_KEY', 'k'); vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 429 })));
  expect((await getNews(parseParams(new URLSearchParams()))).source).toBe('mock'); });
it('falls back to mock on malformed JSON', async () => {
  vi.stubEnv('NEWS_API_KEY', 'k'); vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>')));
  expect((await getNews(parseParams(new URLSearchParams()))).source).toBe('mock'); });
```
- [ ] **Step 2: Run** `npx vitest run tests/unit` → FAIL for new files.
- [ ] **Step 3: Implement `withFallback.ts`.**
```ts
import type { Page } from '../types';
export async function withFallback(live: (() => Promise<Page>) | null, mock: () => Page): Promise<Page> {
  if (!live) return mock();
  try { return await live(); } catch { return { ...mock(), source: 'mock' }; }
}
```
- [ ] **Step 4: `mockData.ts`.** Export `NEWS_SEEDS: Record<Category, {title:string; description:string}[]>` (≥ 8 realistic, distinct entries per category), `MOVIE_SEEDS: {title:string; description:string; category:Category; year:number}[]` (≥ 24 real-feeling films spread across categories), `SOCIAL_SEEDS: {author:string; handle:string; text:string; category:Category}[]` (≥ 40 posts, each text containing 1–3 hashtags such as `#tech #design #markets #fitness`; every category has ≥ 4 posts and `#tech` appears in ≥ 6), `NEWS_SOURCES: string[]`. Test asserts these minimums via the mockProvider tests (9 items × 5 pages = 45 per type must be producible: pool is built by cycling seeds with a numeric edition suffix in `id` only — titles for repeated seeds get a distinct suffix like " — Part 2", so titles stay distinct).
- [ ] **Step 5: `mockProvider.ts`.** Build `pool(type)`: for edition 0..N, for each seed → `ContentItem` with `id = ${type}-${category}-${seedIndex}-${edition}`, `image = https://picsum.photos/seed/${id}/800/520`, `url = '#'`-style `https://example.com/${id}`, `publishedAt` = `new Date(Date.UTC(2026,0,1) + index*3_600_000).toISOString()` (deterministic), `score` = deterministic hash of id mod 100. Filter by `p.categories` (all types), `q` (case-insensitive substring in title+description), `tags` (social only: description includes `#tag`; when `tags` empty, no tag filter). Interleave the per-category lists so categories alternate. Slice `[(page-1)*9, page*9]`; `nextPage = page < MAX_PAGES && end < filtered.length ? page+1 : null`; `source:'mock'`. Social `description` = post text; `title` = `@handle`; `author` = display name.
- [ ] **Step 6: `newsProvider.ts`.**
```ts
export function getNews(p: Params): Promise<Page> {
  const key = process.env.NEWS_API_KEY;
  return withFallback(key ? () => fetchLive(p, key) : null, () => mockPage('news', p));
}
```
  `fetchLive`: if `p.q` → `https://newsapi.org/v2/everything?q=${enc}&pageSize=9&page=${p.page}&sortBy=publishedAt&language=en`; else per category `https://newsapi.org/v2/top-headlines?country=us&category=${cat}&pageSize=${ceil(9/cats.length)}&page=${p.page}` in `Promise.all` (map `technology|sports|business|entertainment|science|health`; `finance` → `business`). Header `X-Api-Key`. `fetch(url, { headers, next: { revalidate: 300 } })`. Throw on `!res.ok` or `json.status !== 'ok'`. Map articles (skip those with `title === '[Removed]'` or no `urlToImage`) → `ContentItem{ id:'news-'+base64url(url).slice(0,24), type:'news', category, ... score: 50 }`; `nextPage = articles.length ? p.page+1 : null` capped at `MAX_PAGES`. Wrap `res.json()` so malformed JSON throws (handled by `withFallback`).
- [ ] **Step 7: `moviesProvider.ts`.** Same shape with `TMDB_API_KEY`: no `q` → `https://api.themoviedb.org/3/discover/movie?with_genres=${ids}&page=${page}&sort_by=popularity.desc`; `q` → `/search/movie?query=`. Category→genre ids: technology/science `878`, sports `99`, finance/business `18`, entertainment `35,12`, health `10751`. Auth via `Authorization: Bearer ${key}` header (v4 read token) — README must document v4 token. Image `https://image.tmdb.org/t/p/w780${poster_path}`, url `https://www.themoviedb.org/movie/${id}`, score = `Math.round(vote_average*10)`, category = first of selected categories whose genre list includes the movie's first genre else `entertainment`.
- [ ] **Step 8: `socialProvider.ts`:** `getSocial(p) = Promise.resolve(mockPage('social', p))` (documented mock; kept async for symmetry).
- [ ] **Step 9: Route handlers** (identical pattern, shown for news):
```ts
import { NextRequest, NextResponse } from 'next/server';
import { parseParams } from '@/lib/params';
import { getNews } from '@/lib/server/newsProvider';
export async function GET(req: NextRequest) {
  const page = await getNews(parseParams(req.nextUrl.searchParams));
  return NextResponse.json(page, { headers: { 'X-Data-Source': page.source } });
}
```
  `search/route.ts`: `q = parseParams(...).q`; if `q.length < 2` → `{news:[],movies:[],social:[]}`; else `Promise.all` of the three providers with `page:1`, `categories: all`, slice 5 each. Use `export const dynamic = 'force-dynamic'` in search.
- [ ] **Step 10: Run** `npx vitest run tests/unit` → PASS.
- [ ] **Step 11: Checkpoint.** typecheck; then `npm run dev` and `curl "http://localhost:3000/api/news?categories=sports&page=2"` returns 9 items with `X-Data-Source: mock`.

---

### Task 4: Redux store, persistence, RTK Query (TDD)

**Files:** Create `src/store/{index.ts,hooks.ts,persist.ts,actions.ts,api.ts}`, `src/store/slices/{preferences,favorites,feedOrder,session,live}.ts`; Test `tests/unit/{preferences,favorites,feedOrder,persist,live}.test.ts`, `tests/helpers.tsx`.

**Interfaces — Produces:**
```ts
// actions.ts
export const hydrateAll = createAction<Partial<PersistedState>>('app/hydrateAll');
export interface PersistedState { preferences: PreferencesState; favorites: FavoritesState; feedOrder: FeedOrderState; profile: Profile }
// preferences.ts
export interface PreferencesState { categories: Category[]; hashtags: string[]; theme: 'light'|'dark'|'system'; language: 'en'|'hi'|'es' }
export const { toggleCategory, setTheme, setLanguage, setHashtags } ; initial = { categories:['technology','sports','finance'], hashtags:['tech','design'], theme:'system', language:'en' }
// favorites.ts
export interface FavoritesState { byId: Record<string, ContentItem> }  export const { toggleFavorite(ContentItem) }
export const selectFavorites = (s: RootState): ContentItem[]; export const selectIsFavorite = (id: string) => (s: RootState) => boolean
// feedOrder.ts
export interface FeedOrderState { ids: string[] }  export const { setOrder(string[]) }
// session.ts
export interface Profile { name: string; avatarColor: string }
export interface SessionState { hydrated: boolean; email: string | null; profile: Profile }  export const { setSessionEmail, updateProfile }
// live.ts
export interface LiveState { pending: ContentItem[]; injected: ContentItem[] }  export const { liveReceived(ContentItem), flushLive() }
// store/index.ts
export function makeStore(preloaded?: Partial<RootState>): AppStore;  export type RootState; export type AppDispatch
// hooks.ts: useAppDispatch, useAppSelector
// persist.ts
export const STORAGE_KEY = 'pulse:v1'
export function loadPersisted(): Partial<PersistedState>   // never throws; corrupt/wrong-version/unavailable → {}
export function savePersisted(s: PersistedState): void     // never throws
// api.ts (RTK Query, reducerPath 'api')
useGetNewsQuery({categories: Category[], page:number}), useGetMoviesQuery({categories, page}), useGetSocialQuery({tags: string[], categories, page}), useSearchQuery({q:string}, {skip})
```
Persisted payload shape: `{ v:1, preferences, favorites, feedOrder, profile }`.

- [ ] **Step 1: Failing tests.**
```ts
// tests/unit/preferences.test.ts
import reducer, { toggleCategory, setTheme, setLanguage } from '@/store/slices/preferences';
const init = reducer(undefined, { type: '@@init' });
it('has sane defaults', () => expect(init.categories).toEqual(['technology','sports','finance']));
it('adds a category', () => expect(reducer(init, toggleCategory('health')).categories).toContain('health'));
it('removes a category', () => expect(reducer(init, toggleCategory('sports')).categories).not.toContain('sports'));
it('refuses to remove the last category', () => {
  let s = { ...init, categories: ['sports'] as typeof init.categories };
  expect(reducer(s, toggleCategory('sports')).categories).toEqual(['sports']); });
it('sets theme + language', () => { const s = reducer(reducer(init, setTheme('dark')), setLanguage('hi')); expect([s.theme, s.language]).toEqual(['dark','hi']); });
// tests/unit/favorites.test.ts
import reducer, { toggleFavorite } from '@/store/slices/favorites';
const item = { id:'n1', type:'news', category:'sports', title:'T', description:'', image:'', url:'', source:'', publishedAt:'', score:1 } as const;
it('toggles on and off', () => { const on = reducer(undefined, toggleFavorite(item)); expect(on.byId.n1.title).toBe('T'); expect(reducer(on, toggleFavorite(item)).byId.n1).toBeUndefined(); });
it('keeps a snapshot so the favorite survives the item leaving the feed', () => expect(reducer(undefined, toggleFavorite(item)).byId.n1).toEqual(item));
// tests/unit/feedOrder.test.ts
import reducer, { setOrder } from '@/store/slices/feedOrder';
it('stores order', () => expect(reducer(undefined, setOrder(['b','a'])).ids).toEqual(['b','a']));
// tests/unit/persist.test.ts
import { loadPersisted, savePersisted, STORAGE_KEY } from '@/store/persist';
import { makeStore } from '@/store';
import { hydrateAll } from '@/store/actions';
it('returns {} when empty', () => expect(loadPersisted()).toEqual({}));
it('returns {} on corrupt JSON', () => { localStorage.setItem(STORAGE_KEY, '{not json'); expect(loadPersisted()).toEqual({}); });
it('returns {} on wrong version', () => { localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 99 })); expect(loadPersisted()).toEqual({}); });
it('drops invalid fields (bad theme) but keeps valid ones', () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ v:1, preferences:{ theme:'neon', language:'es', categories:['sports','bogus'], hashtags:[] } }));
  const p = loadPersisted(); expect(p.preferences?.theme).toBe('system'); expect(p.preferences?.language).toBe('es'); expect(p.preferences?.categories).toEqual(['sports']); });
it('does not throw when localStorage throws', () => {
  const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
  expect(loadPersisted()).toEqual({}); spy.mockRestore();
  const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
  expect(() => makeStore().dispatch(hydrateAll({}))).not.toThrow(); set.mockRestore(); });
it('round-trips state through the store listener only after hydration', () => {
  const s = makeStore(); s.dispatch({ type: 'preferences/setTheme', payload: 'dark' });
  expect(localStorage.getItem(STORAGE_KEY)).toBeNull();          // not hydrated → must not overwrite saved data
  s.dispatch(hydrateAll({})); s.dispatch({ type: 'preferences/setTheme', payload: 'dark' });
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).preferences.theme).toBe('dark'); });
// tests/unit/live.test.ts
import reducer, { liveReceived, flushLive } from '@/store/slices/live';
const it1 = { id:'l1' } as any;
it('queues then flushes to injected, newest first, no duplicates', () => {
  let s = reducer(undefined, liveReceived(it1)); s = reducer(s, liveReceived(it1));
  expect(s.pending).toHaveLength(1);
  s = reducer(s, flushLive()); expect(s.pending).toEqual([]); expect(s.injected.map(i => i.id)).toEqual(['l1']); });
```
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Slices.** `preferences` `toggleCategory`: if present and `length>1` remove; if present and length 1 no-op; else push. `hydrateAll` handled via `extraReducers` in each slice (`(s,a)=>({...s,...a.payload.<key>})`, session maps `profile`). `favorites.toggleFavorite`: delete if exists else set snapshot. `selectFavorites = createSelector(s=>s.favorites.byId, byId=>Object.values(byId))`. `session.hydrated` set true on `hydrateAll`. `live`: `liveReceived` ignores ids already in `pending` or `injected`; `flushLive` → `injected=[...pending,...injected]; pending=[]`.
- [ ] **Step 4: `persist.ts`.** `loadPersisted`: `try { raw=localStorage.getItem; JSON.parse; require v===1; return { preferences: sanitizePrefs(x.preferences), favorites: ..., feedOrder: ..., profile: ... } } catch { return {} }`. `sanitizePrefs`: theme ∈ light|dark|system else `'system'`; language ∈ en|hi|es else `'en'`; categories filtered by `CATEGORIES`, empty → default; hashtags: strings matching `/^[a-z0-9_]{1,30}$/`, max 10; omit key entirely if input key missing. `savePersisted`: `try { setItem(STORAGE_KEY, JSON.stringify({v:1,...})) } catch {}`.
- [ ] **Step 5: `store/index.ts`.** `configureStore` with reducers `{ preferences, favorites, feedOrder, session, live, [api.reducerPath]: api.reducer }`, middleware: `getDefaultMiddleware().concat(api.middleware, listener.middleware)`. Listener: `startListening({ predicate: (_a, s) => s.session.hydrated, effect: (_a, { getState }) => savePersisted(pick(getState())) })` — runs on every action post-hydration (cheap; guard with a shallow compare of the four persisted slice references vs last saved to avoid writing on api actions).
- [ ] **Step 6: `api.ts`.**
```ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
const baseUrl = (typeof window === 'undefined' ? 'http://localhost:3000' : window.location.origin) + '/api';
const infinite = (url: string, extra: (a: any) => Record<string, string>) => ({
  query: (a: any) => ({ url, params: { page: a.page, categories: a.categories.join(','), ...extra(a) } }),
  serializeQueryArgs: ({ queryArgs }: any) => `${url}|${queryArgs.categories.join(',')}|${(queryArgs.tags ?? []).join(',')}`,
  merge: (cur: Page, inc: Page, { arg }: any) => { if (arg.page === 1) return inc; const seen = new Set(cur.items.map(i => i.id)); cur.items.push(...inc.items.filter(i => !seen.has(i.id))); cur.nextPage = inc.nextPage; cur.source = inc.source; },
  forceRefetch: ({ currentArg, previousArg }: any) => currentArg?.page !== previousArg?.page,
});
export const api = createApi({ reducerPath: 'api', baseQuery: fetchBaseQuery({ baseUrl }), endpoints: b => ({
  getNews: b.query<Page, FeedArgs>(infinite('news', () => ({}))),
  getMovies: b.query<Page, FeedArgs>(infinite('movies', () => ({}))),
  getSocial: b.query<Page, FeedArgs>(infinite('social', a => ({ tags: (a.tags ?? []).join(',') }))),
  search: b.query<SearchResult, { q: string }>({ query: ({ q }) => ({ url: 'search', params: { q } }) }),
}) });
```
  (`FeedArgs = { categories: Category[]; page: number; tags?: string[] }`; type the helper properly instead of `any` — strict, no `any` in src.)
- [ ] **Step 7: `tests/helpers.tsx`:** `renderWithStore(ui, { preloaded, store = makeStore(preloaded) })` wrapping `<Provider>`; dispatches `hydrateAll({})` so persistence is active; also wraps with the i18n provider once Task 6 exists (add then). Re-export RTL.
- [ ] **Step 8: Run** `npx vitest run tests/unit` → PASS. **Checkpoint:** typecheck green.

---

### Task 5: Mock authentication (TDD for crypto helper)

**Files:** Create `src/lib/auth.ts`, `src/app/api/auth/{login,logout,session}/route.ts`, `middleware.ts`, `src/app/login/page.tsx`; Test `tests/unit/auth.test.ts`.

**Interfaces — Produces:**
```ts
// auth.ts (Web Crypto only — runs on Edge + Node)
export const COOKIE = 'pulse_session'
export async function signSession(email: string, secret: string): Promise<string>        // `${b64url(email)}.${hmac}`
export async function verifySession(token: string | undefined, secret: string): Promise<string | null>  // email or null
export function validateCredentials(mode:'login'|'signup', email:string, password:string): string | null  // error message key or null
```
- [ ] **Step 1: Failing tests:** sign→verify returns email; tampered token → null; wrong secret → null; `undefined`/garbage/empty → null; `validateCredentials('login','demo@pulse.dev','pulse123')` → null; wrong password → `'invalid'`; signup with bad email → `'email'`, password < 6 → `'password'`, valid → null.
- [ ] **Step 2: Implement** with `crypto.subtle` HMAC-SHA-256, base64url helpers, constant-time-ish compare via recomputing and comparing strings of equal length.
- [ ] **Step 3: Routes.** `POST /api/auth/login` body `{mode,email,password}` → validates, on success sets cookie `pulse_session` (`httpOnly`, `sameSite:'lax'`, `path:'/'`, `secure` in production, `maxAge` 7 d) and returns `{email}`; failure → `401 {error}`. `POST /api/auth/logout` clears cookie. `GET /api/auth/session` → `{email}` or `401`. `AUTH_SECRET` missing in production → 500 with clear log; in dev fall back to a documented dev secret.
- [ ] **Step 4: `middleware.ts`** — matcher excludes `/login`, `/api/auth`, `_next`, static assets; no/invalid cookie → redirect to `/login`; valid cookie on `/login` → redirect `/`. API routes other than auth also require a valid cookie (401 JSON) so keys can't be used anonymously.
- [ ] **Step 5: Login page** (client component, `frontend-design` quality): split-screen — left editorial hero ("Your world, curated." Fraunces display, animated gradient blob, 3 floating sample cards), right form card with Login / Sign up segmented control, email + password labelled inputs with inline validation (`aria-invalid`, `aria-describedby`), "Use demo account" button that fills creds, submit spinner, error `role="alert"`. On success `router.replace('/')`. Strings via i18n keys from Task 6 (use literal English until Task 6 wires `t`, then replace).
- [ ] **Step 6: Run** unit tests PASS. **Checkpoint:** manual `curl -i -X POST /api/auth/login` sets cookie; visiting `/` unauthenticated redirects to `/login`.

---

### Task 6: App shell — providers, theme, i18n, sidebar, header

**Files:** Create `src/app/providers.tsx`, `src/components/{StoreHydrator,ThemeSync,Sidebar,Header,ThemeToggle,LanguageSwitch,AccountMenu,PageHeader}.tsx`, `src/lib/i18n.ts`, `src/locales/{en,hi,es}.json`, `src/app/(dashboard)/layout.tsx`; Test `tests/unit/{theme,i18n}.test.tsx`.

**Interfaces — Consumes:** Task 4 store/hooks. **Produces:** `Providers` (Redux `Provider` + i18n + `StoreHydrator` + `ThemeSync`), `t()` keys (below), `<PageHeader title subtitle />`.

i18n key set (all three locale files must contain every key): `nav.feed, nav.trending, nav.favorites, nav.settings, header.search, header.searchHint, account.signOut, account.profile, feed.title, feed.subtitle, feed.empty.title, feed.empty.body, feed.error.title, feed.error.body, feed.retry, feed.loadingMore, feed.endReached, feed.newItems (with {{count}}), card.read, card.play, card.view, card.favorite, card.unfavorite, card.drag, trending.title, trending.news, trending.movies, trending.posts, favorites.title, favorites.empty.title, favorites.empty.body, settings.title, settings.categories, settings.hashtags, settings.theme, settings.language, settings.profile, settings.name, settings.avatarColor, settings.saved, search.placeholder, search.noResults, search.news, search.movies, search.social, search.minChars, auth.login, auth.signup, auth.email, auth.password, auth.demo, auth.invalid, theme.light, theme.dark, theme.system, category.<each of 7>, sr.skipToContent, sr.moved ("Moved {{title}} to position {{pos}} of {{total}}").

- [ ] **Step 1: Failing tests.** `theme.test.tsx`: render `<ThemeSync/>` in store with `theme:'dark'` → `document.documentElement.dataset.theme === 'dark'`; with `'system'` + `matchMedia` mocked to `matches:true` → `'dark'`; switching to `'light'` updates. `i18n.test.tsx`: every locale JSON has the identical key set as `en.json` (iterate flattened keys); changing `preferences.language` to `es` makes `LanguageSwitch`-consuming text change (render `<Sidebar/>` and expect "Favoritos").
- [ ] **Step 2: Implement `i18n.ts`** — `i18next.use(initReactI18next).init({ resources, lng:'en', fallbackLng:'en', interpolation:{escapeValue:false}, react:{useSuspense:false} })`; a `LanguageSync` inside `Providers` runs `i18n.changeLanguage(lang)` and sets `document.documentElement.lang` from the store. Write complete, natural translations (Hindi in Devanagari, Spanish) for every key.
- [ ] **Step 3: `StoreHydrator`** — `useEffect(() => { dispatch(hydrateAll(loadPersisted())); fetch('/api/auth/session').then(r => r.ok ? r.json() : null).then(d => d && dispatch(setSessionEmail(d.email))) }, [])`. **`ThemeSync`** — effect resolves `system` via `matchMedia('(prefers-color-scheme: dark)')`, listens for changes while `system`, writes `dataset.theme`.
- [ ] **Step 4: `Providers`** — `const [store] = useState(makeStore)`; compose Provider → I18nextProvider → hydrator/syncs → children.
- [ ] **Step 5: Dashboard layout (`frontend-design` + Himan-FXD agent).** CSS grid: desktop (≥1024px) 264px glass sidebar (sticky, `backdrop-blur`, brand mark "Pulse" with animated pulse dot, nav links with `lucide-react` icons + active pill using Framer `layoutId="nav-pill"`, favorites count badge, bottom card "Live" status dot); tablet 72px icon rail; mobile (<768px) fixed bottom tab bar with 4 items + safe-area padding. Header (sticky, blurred): skip link (`sr.skipToContent`) as first focusable; search trigger button styled as input (`/` hint kbd) opening Task 10's palette; `ThemeToggle` (sun/moon morph, `aria-pressed`); `LanguageSwitch` (listbox/menu with `lang` labels); `AccountMenu` (avatar from `profile.avatarColor` + initial, menu with name/email, Settings link, Sign out → `POST /api/auth/logout` then `router.replace('/login')`). `<main id="main" tabIndex={-1}>` hosting `{children}` inside a Framer `AnimatePresence` page-transition wrapper keyed on `usePathname()` (opacity+y 8px, 220 ms; static under reduced motion via `useReducedMotion`).
- [ ] **Step 6: Run** unit tests PASS; **Checkpoint:** `npm run dev`, sign in with demo creds, shell renders at 1440/820/390 widths, theme toggle persists after reload with no flash.

---

### Task 7: Content card and shared states

**Files:** Create `src/components/{ContentCard,CardImage,FavoriteButton,Skeleton,EmptyState,ErrorState,CategoryChips}.tsx`; Test `tests/integration/content-card.test.tsx`.

**Interfaces — Produces:**
```ts
<ContentCard item={ContentItem} draggable?: boolean />      // horizontal editorial card; role="article"
<FavoriteButton item={ContentItem} />                        // aria-pressed, toggles favorites
<CardSkeleton count?: number />  <EmptyState icon title body action? />  <ErrorState onRetry />   // ErrorState has role="alert"
<CategoryChips selected: Category[] onToggle(c) />          // role="group", buttons aria-pressed
```
- [ ] **Step 1: Failing tests (RTL).** Card renders title, description, source, relative date, category chip, image `alt=""` decorative or alt=title; CTA text by type (`news` → "Read more", `movie` → "Play now", `social` → "View post") as an `<a target="_blank" rel="noopener noreferrer">`; clicking `FavoriteButton` flips `aria-pressed` and adds to store; image `onError` swaps to gradient fallback (no broken icon); a title containing `<img src=x onerror=alert(1)>` renders as text; `ErrorState` calls `onRetry` on click; `EmptyState` renders action.
- [ ] **Step 2: Implement (Himan-FXD).** Card: surface bg, 1px `--line` border, `--radius-card`, image 16:10 left (full-width top on mobile) with gradient overlay and type badge (News / Movie / Post, each with its own icon), title in Fraunces 20/26 (line-clamp 2), description 2-line clamp, footer: source · time, `FavoriteButton` (heart fill animation via Framer spring; respects reduced motion), CTA button (accent). Hover: `whileHover={{ y:-4 }}`, shadow grows, image scale 1.04 (CSS). Drag handle (`GripVertical`) rendered only when `draggable`. `Skeleton` uses `.skeleton` shimmer. `CardImage` handles lazy loading + fallback. Relative time via `Intl.RelativeTimeFormat` with active language.
- [ ] **Step 3: Run** tests PASS. **Checkpoint:** typecheck green.

---

### Task 8: Feed with infinite scroll, drag-and-drop, live updates (TDD)

**Files:** Create `src/hooks/{useFeed,useInfiniteSentinel,useLiveFeed}.ts`, `src/components/{SortableFeed,NewItemsPill}.tsx`, `src/app/api/stream/route.ts`, `src/app/(dashboard)/page.tsx`; Test `tests/integration/feed.test.tsx`, `tests/msw.ts`.

**Interfaces — Consumes:** Tasks 2, 4, 7. **Produces:**
```ts
useFeed(): { items: ContentItem[]; isLoading: boolean; isFetchingMore: boolean; isError: boolean; hasMore: boolean; loadMore(): void; retry(): void }
useInfiniteSentinel(onHit: () => void, enabled: boolean): React.RefCallback<HTMLElement>   // IntersectionObserver, rootMargin 400px
useLiveFeed(): void           // EventSource('/api/stream') → dispatch(liveReceived); closes on unmount
<SortableFeed items />        // Framer Reorder.Group axis="y"; onReorder → dispatch(setOrder(ids))
```
`useFeed` logic: `page` state starts 1, reset to 1 when `categories`/`hashtags` change; three queries `{categories, page, tags}`; `hasMore = [news,movies,social].some(r => r.data?.nextPage != null)`; `items = applyOrder(interleave([injected, news.items, movies.items, social.items]), order)`; `isError` only when **all three** failed and no items (partial failure still shows what loaded); `retry` refetches failed queries.
SSE route: `GET /api/stream?interval=` → `ReadableStream` with `Content-Type: text/event-stream`, `Cache-Control: no-cache, no-transform`, `Connection: keep-alive`; every `interval` seconds (clamped 1–60, default 20) emits `data: ${JSON.stringify(item)}\n\n` where `item` is a fresh ContentItem (`id: live-${Date.now()}`, cycling news/social seeds, `publishedAt: now`); heartbeat comment `: ping\n\n` every 15 s; clears timers on `req.signal` abort.

- [ ] **Step 1: MSW setup** (`tests/msw.ts`): `setupServer` exporting `server` and helper `pageOf(n, prefix)`; `beforeAll(listen)`, `afterEach(resetHandlers)`, `afterAll(close)` registered inside the integration test files.
- [ ] **Step 2: Failing tests (`feed.test.tsx`).**
  - renders items from all three sources interleaved after load (news/movie/post badges present), skeletons while loading.
  - empty: all three endpoints return `{items:[],nextPage:null}` → "Nothing here yet" empty state, no skeletons, no error.
  - error: all three respond 500 → `role="alert"` ErrorState; clicking retry with handlers fixed shows items.
  - partial failure: movies 500, others OK → items shown, no blocking error.
  - infinite scroll: trigger the observer callback (mock IntersectionObserver capturing callback) → page 2 requested, items appended, duplicate ids from page 2 not duplicated.
  - order: preloaded `feedOrder.ids=['b','a']` → rendered order starts b, a; unknown saved id ignored.
  - keyboard reorder: focus drag handle of item 2, press `ArrowUp` → store `feedOrder.ids[0]` is that item and live region `aria-live="polite"` text equals "Moved {title} to position 1 of N".
  - end reached: `nextPage:null` → "You're all caught up" message, sentinel not observed.
  - live: dispatch `liveReceived` → NewItemsPill "1 new item"; click → item first in feed, pill gone.
- [ ] **Step 3: Run** → FAIL.
- [ ] **Step 4: Implement hooks/components.** `SortableFeed`: `<Reorder.Group axis="y" values={items} onReorder={next => dispatch(setOrder(next.map(i => i.id)))} as="ol" className="grid gap-5">` with each `<Reorder.Item key={item.id} value={item} as="li" dragListener={false} dragControls={controls}>`; handle `onPointerDown={e => controls.start(e)}` with `touch-action:none`; handle is a `<button aria-label=t('card.drag') aria-describedby=hint>`; `onKeyDown` ArrowUp/ArrowDown computes new array, dispatches `setOrder`, sets live-region message, keeps focus on the moved handle (`useEffect` refocus by `data-handle-id`). Dragging item styles: `whileDrag={{ scale:1.02, boxShadow }}`. Under reduced motion disable `layout` animations. Stagger entrance (`delay: min(index,8)*0.04`) only for first render of each item.
  `NewItemsPill`: sticky top-center floating pill, `role="status"`, appears via spring, text `t('feed.newItems',{count})`, click → `flushLive()` + `window.scrollTo({top:0,behavior})`.
  Feed page: `PageHeader`, `CategoryChips` quick filter bound to preferences (toggle writes to store), list, bottom sentinel + spinner (`feed.loadingMore`), end message. Call `useLiveFeed()` once here.
- [ ] **Step 5: Run** tests PASS. **Checkpoint:** dev server — feed loads, scroll appends, drag reorders and survives reload, SSE pill appears (use `/api/stream?interval=2` in a quick curl to confirm the stream format).

---

### Task 9: Trending, Favorites, Settings pages

**Files:** Create `src/app/(dashboard)/{trending,favorites,settings}/page.tsx`; Test `tests/integration/{favorites,settings}.test.tsx`.

- [ ] **Step 1: Failing tests.** *favorites:* with no favorites → empty state with CTA to feed; favorite an item in the feed (render both via shared store) then Favorites page lists it; unfavoriting removes it; a favorite whose id is absent from API responses still renders from snapshot. *settings:* clicking a `CategoryChips` button updates store + `localStorage` (`pulse:v1`); unselecting the last category is a no-op and shows `aria-live` hint; theme radio group updates `data-theme`; language select updates `<html lang>`; hashtag input adds a valid tag (`#Tech` → `tech`), rejects `<b>`; profile name edit persists, empty name rejected (min 1, max 40) with inline error; "Saved" toast `role="status"`.
- [ ] **Step 2: Trending page.** Tabs (`role="tablist"`, arrow-key nav) News / Movies / Posts using the same RTK queries (page 1, user categories) sorted by `score` desc, top 10. Layout: bento grid — rank #1 spans 2 cols × 2 rows with large image and display numeral; ranks 2–5 medium; 6–10 compact list with big rank numerals (Fraunces outline style). Tab switch animated with `AnimatePresence mode="wait"`. Loading skeleton, error + empty states reused.
- [ ] **Step 3: Favorites page.** Grid of `ContentCard`s from `selectFavorites`, filter pills by type, count in header, empty state illustration (inline SVG heart), layout animation on removal.
- [ ] **Step 4: Settings page.** Sections as cards: Interests (`CategoryChips` for all 7 + trending-topic hashtag editor), Appearance (theme segmented radio `light/dark/system` with live preview swatches), Language (3 radio cards), Profile (name field, 8 avatar color swatches `role="radiogroup"`, live avatar preview). Saves immediately (Redux → localStorage) with a toast.
- [ ] **Step 5: Run** tests PASS. **Checkpoint:** typecheck + manual pass of all three pages.

---

### Task 10: Debounced search palette

**Files:** Create `src/components/SearchPalette.tsx`; wire into `Header` (Task 6); Test `tests/integration/search.test.tsx`.

**Interfaces:** `<SearchPalette open onClose />` (dynamic import `next/dynamic`, `ssr:false`, loaded on first open).

- [ ] **Step 1: Failing tests (fake timers + MSW counting requests to `/api/search`).**
  - typing "react" quickly (5 keystrokes via `userEvent` with `advanceTimers`) triggers **exactly one** request after 300 ms.
  - 0–1 chars → no request, shows `search.minChars` hint; whitespace-only → no request.
  - results grouped under News / Movies / Posts headings; zero results → `search.noResults` containing the query as text (HTML in query is escaped — assert `<script>` not in DOM as an element).
  - `ArrowDown/Up` moves `aria-activedescendant`; `Enter` opens selected item's `url` (`window.open` mocked, `noopener`); `Escape` closes and returns focus to trigger; focus trapped while open; `role="dialog" aria-modal="true"`, input `role="combobox"` `aria-expanded`, results `role="listbox"`.
  - error response → inline `role="alert"` with retry.
  - in-flight request is aborted/ignored when the query changes (stale response doesn't overwrite newer results).
- [ ] **Step 2: Implement.** `const debounced = useDebouncedValue(q.trim(), 300); const { data, isFetching, isError, refetch } = useSearchQuery({ q: debounced }, { skip: debounced.length < 2 })` (RTK Query cancels/ignores stale results by arg). Global `/` and `Ctrl/Cmd+K` open it (ignore when typing in inputs). Visual: centered frosted dialog (max-w 640), large input with spinner, grouped results with thumbnails, highlight matched substring via `<mark>` built from text nodes (never `dangerouslySetInnerHTML`), footer key hints, entrance scale+fade (disabled under reduced motion), body scroll lock.
- [ ] **Step 3: Run** tests PASS. **Checkpoint:** manual `/` shortcut, typing, keyboard nav.

---

### Task 11: Accessibility, security headers, performance pass

**Files:** Modify `next.config.ts`, `src/app/layout.tsx`, components as needed; Create `tests/unit/headers.test.ts`.

- [ ] **Step 1: `next.config.ts` headers** for all routes: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, `Content-Security-Policy`: `default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' (+ 'unsafe-eval' only in dev); font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`. Test imports the exported `headers()` result and asserts those keys exist.
- [ ] **Step 2: Run the `design:accessibility-review` skill** against the built UI; fix every AA failure it reports (contrast of `--muted` on `--surface-2` in both themes, focus order, labels, landmark uniqueness, touch targets ≥ 44px, `aria-live` regions, reduced motion).
- [ ] **Step 3: Performance:** `React.memo` on `ContentCard`; `useCallback` on handlers passed to cards; confirm `SearchPalette` is not in the initial bundle (`npm run build` route sizes); images have intrinsic `width/height` or aspect-ratio boxes (no CLS).
- [ ] **Step 4: Checkpoint:** `npm run build && npm test` green.

---

### Task 12: Playwright E2E

**Files:** Create `e2e/{auth,search,reorder,favorites,theme}.spec.ts`, `e2e/helpers.ts`.

`helpers.ts`: `login(page)` → goto `/login`, click "Use demo account", submit, wait for `/`.

- [ ] **Step 1: Write specs.**
  - *auth:* unauthenticated `/` redirects to `/login`; wrong password shows alert; demo login lands on feed; sign-out returns to `/login`.
  - *search:* press `/`, type "ai" slowly; wait for results listbox; assert only **one** `/api/search` request (`page.on('request')` counter) after typing; result group headings visible; Escape closes.
  - *reorder:* locate first and second feed items' titles; drag handle of item 1 below item 2 using `page.mouse` (`move` → `down` → `move` with `steps:20` → `up`); assert order swapped; `page.reload()`; assert order persisted. Second test uses keyboard (focus handle, `ArrowDown`) as the reliable path.
  - *favorites:* click heart on first card, open Favorites via sidebar, card present; reload, still present; unfavorite → empty state.
  - *theme:* toggle dark → `html[data-theme=dark]`; reload → still dark with no `light` flash (check initial attribute via `page.addInitScript`-free `page.goto` + immediate evaluate); language switch to Español → sidebar shows "Favoritos".
  - *settings:* deselect a category → feed no longer includes cards of that category badge.
- [ ] **Step 2: Run** `npm run e2e` → all PASS (use `reuseExistingServer`; fix flakiness with web-first assertions, no fixed sleeps).
- [ ] **Step 3: Checkpoint:** `npm test && npm run e2e` green.

---

### Task 13: Documentation, final review, verification

**Files:** Create `README.md`.

- [ ] **Step 1: README** sections: hero + feature list mapped 1:1 to the PDF requirements (checklist), tech stack, quick start (`npm i`, `cp .env.example .env.local`, `npm run dev`), env vars table (NEWS_API_KEY from newsapi.org, TMDB_API_KEY = v4 read token, AUTH_SECRET) and mock-mode explanation, demo credentials, scripts, architecture diagram (ASCII data flow), folder structure, state-management notes, testing guide with commands, accessibility notes, security notes (keys server-only, headers, cookie), known limitations (social = mock, NewsAPI dev-plan restrictions, mock auth), deployment (Vercel: import repo, set env vars; optional), user-flow walkthrough, "how to publish to GitHub" (plain instructions for the user to run themselves).
- [ ] **Step 2: Reviews.** Run, in order: `design-review` skill (visual polish, spacing, AI-slop check) and fix findings; `code-review` skill on the codebase and fix confirmed findings; `superpowers:verification-before-completion`.
- [ ] **Step 3: Final verification (all must pass, show output):** `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run e2e`.
- [ ] **Step 4: Spec coverage walk-through:** tick each PDF requirement in README checklist against a running app; list anything not met.
- [ ] **Step 5: Hand-off message:** how to run, demo creds, what is mock vs live, and offer (not perform) Vercel deploy/GitHub publish and a demo-video script.
