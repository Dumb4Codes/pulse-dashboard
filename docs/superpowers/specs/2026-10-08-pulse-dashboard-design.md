# Pulse — Personalized Content Dashboard: Design Spec

Source: "SDE Intern – Frontend Development Assignment" PDF. Date: 2026-10-08.

## 1. Goal
A polished, accessible, tested Next.js dashboard that merges news, movie recommendations and social posts into one personalized, searchable, re-orderable feed. It must satisfy every requirement in the PDF (core, advanced UI, state, testing, bonus) and its evaluation criteria (functionality, code quality, UI/UX + WCAG, Redux usage, performance, testing, creativity, security).

## 2. Decisions (agreed with user)
- **Data:** Hybrid. Next.js route handlers call real APIs (NewsAPI, TMDB) when keys exist in `.env.local`; otherwise serve seeded realistic mock data. Social posts are mock (allowed by PDF). Keys never reach the client.
- **Bonus features included:** mock auth + editable profile, SSE real-time feed, react-i18next (EN/HI/ES).
- **No git operations** are performed by the assistant (user instruction). README documents how the user can publish.
- **Process:** plan via writing-plans; UI built with the frontend-design / Himan-FXD agent; verify with design-review, QA, code-review skills.

## 3. Stack
Next.js 15 (App Router) · React 19 · TypeScript (strict) · Redux Toolkit + RTK Query · Tailwind CSS (tokens via CSS custom properties) · Framer Motion · react-i18next · Vitest + React Testing Library + MSW · Playwright.

## 4. Architecture
```
src/
  app/
    layout.tsx, providers.tsx, globals.css (design tokens)
    login/page.tsx
    (dashboard)/layout.tsx          # sidebar + header shell
    (dashboard)/page.tsx            # Feed
    (dashboard)/trending/page.tsx
    (dashboard)/favorites/page.tsx
    (dashboard)/settings/page.tsx   # preferences + profile
    api/{news,movies,social,search,stream,auth/*}/route.ts
  lib/
    server/{newsProvider,moviesProvider,socialMock,mockData}.ts
    types.ts (ContentItem, Category, Source)
    normalize.ts, interleave.ts, debounce hook, i18n.ts
  store/
    index.ts, persist.ts (localStorage middleware + hydration)
    slices/{preferences,favorites,feedOrder,session,live}.ts
    api.ts (RTK Query)
  components/ (Sidebar, Header, SearchPalette, ContentCard, Feed, SortableFeed, Skeleton, EmptyState, ErrorState, ThemeToggle, LanguageSwitch, NewItemsPill, ...)
tests/{unit,integration}/  e2e/
```

### Data model
`ContentItem { id, type: 'news'|'movie'|'social', category, title, description, image, url, source, author?, publishedAt, score }` — all providers normalize to this.

### API routes
- `GET /api/news?categories=&page=&q=` · `GET /api/movies?categories=&page=&q=` · `GET /api/social?tags=&page=&q=` — each returns `{items, nextPage}`; real provider if key present, else mock; provider failure falls back to mock and sets `X-Data-Source: mock`.
- `GET /api/search?q=` — fan-out across the three, merged.
- `GET /api/stream` — SSE, emits a new item every ~20 s.
- `POST /api/auth/login|logout`, `GET /api/auth/session` — mock credentials (demo user documented), httpOnly cookie. Dashboard routes redirect to `/login` via middleware.

### State
- Redux slices `preferences` (categories, theme, language, hashtags), `favorites` (by id, stores the item snapshot), `feedOrder` (ids), `session` (profile), `live` (pending new items).
- `preferences`, `favorites`, `feedOrder`, `session.profile` persisted to localStorage via listener middleware; hydrated on client mount (avoids SSR mismatch).
- RTK Query endpoints per source with page-cursor infinite scroll (IntersectionObserver sentinel); feed = interleave(news, movies, social), then applied user order.

### Feature behaviors
- **Feed:** infinite scroll, skeleton loading, empty + error states with retry.
- **Trending:** categorized bento grid, tabs (News/Movies/Posts), ranked by `score`.
- **Favorites:** heart toggle on cards; section lists saved items; empty state.
- **Search:** header input, 300 ms debounce, command-palette overlay, grouped results by type, keyboard navigable, `/` shortcut.
- **Drag-and-drop:** Framer Motion `Reorder` grid/list with drag handle; keyboard reordering (focus handle + arrow keys + live-region announcements); order persisted.
- **Dark mode:** `data-theme` attribute driving CSS variables, Tailwind `darkMode: ['class','[data-theme="dark"]']`; respects system default; no flash (inline script).
- **Animations:** page transitions, card hover lift, shimmer skeletons, spinner; all disabled under `prefers-reduced-motion`.
- **Real-time:** `EventSource` → `live` slice → "N new items" pill → prepend on click.
- **i18n:** UI strings in EN/HI/ES, switcher in header, persisted.
- **Auth/Profile:** login page, avatar menu, editable display name/avatar color in Settings.

## 5. Design direction
Editorial-modern: Fraunces (headlines) + Inter (UI); light = warm cream/ink, dark = deep navy; one vivid accent (electric coral/indigo gradient used sparingly). Glass sidebar (collapsible; bottom tab bar on mobile), bento trending, image-overlay cards, subtle grain. Tokens as CSS variables (`--bg, --surface, --ink, --muted, --accent, --ring, --radius`). WCAG AA contrast, visible focus rings, semantic landmarks, ARIA labels, skip link.

## 6. Security
API keys only in server env; `.env.example` committed, `.env.local` gitignored; route handlers validate/clamp query params; image hosts allow-listed in `next.config`; security headers (CSP-lite, X-Content-Type-Options, Referrer-Policy); auth cookie httpOnly + SameSite=Lax; no secrets in client bundle.

## 7. Testing
- **Unit (Vitest):** preferences/favorites/feedOrder reducers, persist/hydrate, interleave/normalize, debounce hook (fake timers), provider fallback logic.
- **Integration (RTL + MSW):** Feed renders items, empty state, error + retry, infinite scroll appends, favorites toggle reflects in Favorites, search overlay results/no results, settings change refetches.
- **E2E (Playwright):** login → feed; debounced search; drag-and-drop reorder persists after reload; favorite flow; dark-mode persists; language switch.
- Target: all green via `npm test` and `npm run e2e`.

## 8. Performance
Debounced search, request cancellation, RTK Query caching, `next/image`, lazy-loaded search palette, memoized cards, virtual-free infinite scroll with capped page size, skeletons to avoid layout shift.

## 9. Deliverables
Runnable project in `pulse-dashboard/`, README (setup, env vars, user flow, architecture, testing, deployment/publish steps), `.env.example`, demo credentials, scripts: `dev`, `build`, `test`, `e2e`, `lint`, `typecheck`.

## 10. Out of scope
Real OAuth/NextAuth providers, real Twitter/Instagram APIs, a database, recording the demo video (script offered), publishing to GitHub/Vercel (done only on explicit request).
