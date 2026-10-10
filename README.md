# Pulse

**A personalized content dashboard that puts news, movie recommendations and social posts into one searchable, re-orderable, themeable feed.**

Pulse is a Next.js (App Router) application built for the *SDE Intern - Frontend Development* assignment. You choose the categories and hashtags you care about; Pulse fetches news (NewsAPI), movies (TMDB) and social posts, interleaves them into a single infinite-scrolling feed, and lets you drag cards into your own order, favorite what you like, search everything from a keyboard-driven command palette, and switch between light and dark themes and three languages (English, Hindi, Spanish). New items stream in live over Server-Sent Events.

It runs out of the box with **no API keys**: every source falls back to seeded, realistic mock data, so a fresh clone is fully demo-able in about a minute.

Next.js 16 | React 19 | TypeScript (strict) | Redux Toolkit + RTK Query | Tailwind CSS v4 | Framer Motion | react-i18next | Vitest + React Testing Library + MSW | Playwright

---

## Contents

1. [Features (assignment checklist)](#features-assignment-checklist)
2. [Tech stack](#tech-stack)
3. [Quick start](#quick-start)
4. [Environment variables](#environment-variables)
5. [Demo credentials](#demo-credentials)
6. [Scripts](#scripts)
7. [Architecture](#architecture)
8. [Folder structure](#folder-structure)
9. [State management](#state-management)
10. [Testing](#testing)
11. [Accessibility](#accessibility)
12. [Security](#security)
13. [Known limitations](#known-limitations)
14. [Deployment on Vercel](#deployment-on-vercel)
15. [User-flow walkthrough](#user-flow-walkthrough)
16. [Publishing to GitHub](#publishing-to-github)

---

## Features (assignment checklist)

The checklist below follows the assignment PDF section by section.

### 1. Core features

- [x] **User preferences** - a Settings page (`/settings`) lets you pick from seven categories (technology, sports, finance, entertainment, science, health, business) and manage a hashtag list. Everything saves immediately and persists across reloads (Redux store mirrored to `localStorage`, key `pulse:v1`). The last remaining category cannot be removed, so the feed is never empty by accident.
- [x] **Data fetching: News API** - `GET /api/news` calls NewsAPI (`top-headlines` per category, `everything` for searches) when `NEWS_API_KEY` is set.
- [x] **Data fetching: Recommendations API** - `GET /api/movies` calls TMDB (`discover/movie` by the genres your categories map to, `search/movie` for searches) when `TMDB_API_KEY` is set.
- [x] **Data fetching: Social Media API** - `GET /api/social` serves hashtag-filtered posts from a **mock** provider (explicitly allowed by the PDF; see [Known limitations](#known-limitations)).
- [x] **Interactive content cards** - image, headline, short description, source and relative date, a favorite heart, and a call-to-action that matches the content: **Read more** (news), **Play now** (movies), **View post** (social). CTAs open in a new tab. Missing or broken images fall back to a tinted gradient.
- [x] **Details page** (`/content/[id]`) - click anywhere on a card (or a Trending tile, or a search result) to open it. The page shows the photograph, headline, description, source and date, a trending-score ring, a "Why you're seeing this" note (derived from your categories and hashtags), the same heart and type-specific call-to-action as the cards, **Copy link**, and up to three related items from the same category. It reuses the app's tokens and motion (rising headline mask, settling photo, self-drawing ring, staggered entrances) and is light/dark, responsive, keyboard-accessible and translated (EN / HI / ES). Works after a reload and from a bookmark (see [Known limitations](#known-limitations)).
- [x] **Infinite scrolling** - an `IntersectionObserver` sentinel (400 px ahead of the fold) loads the next page of all three sources; skeleton cards while loading, a "Loading more..." spinner, a non-blocking notice when one source fails, and an end-of-feed message. 9 items per source per page, up to 5 pages.

### 2. User dashboard layout

- [x] **Main layout** - responsive shell: a 264 px glass sidebar on desktop, a 72 px icon rail on tablets, and a floating bottom tab bar on phones. The sticky header holds the search trigger, language menu, theme toggle and account menu (profile, settings link, sign out).
- [x] **Personalized feed section** (`/`) - news, movies and posts interleaved in one list for your categories and hashtags.
- [x] **Trending section** (`/trending`) - News / Movies / Posts tabs, each ranked by `score` for your categories: a bento grid for the top five and an "Also rising" list for ranks 6-10.
- [x] **Favorites section** (`/favorites`) - heart any card; favorites keep a full snapshot of the item, so they stay available even after the item leaves the feed. Filter by type, remove with the heart, friendly empty states.

### 3. Search

- [x] **Search bar across content types** - the header search opens a command palette that queries news, movies and posts together (`GET /api/search`) and shows grouped results (top five per type) with matched text highlighted. Open it with the header button, `/`, or `Ctrl`/`Cmd` + `K`.
- [x] **Debounced search** - input is debounced by 300 ms (`useDebouncedValue`), nothing is sent below 2 characters, and input is capped at 100 characters. Typing five characters quickly produces exactly one request.

### 4. Advanced UI/UX

- [x] **Drag-and-drop reordering** - Framer Motion `Reorder` with a dedicated drag handle on every feed card. There is a full keyboard equivalent (focus the handle, press `ArrowUp` / `ArrowDown`) with screen-reader announcements. The custom order is saved to `localStorage` and survives reloads; ids that disappear from the feed are ignored.
- [x] **Dark mode via CSS custom properties and Tailwind** - design tokens (`--bg`, `--surface`, `--ink`, `--muted`, `--accent`, `--ring`, ...) are swapped by `<html data-theme>`, and Tailwind v4's `dark:` variant is wired to the same attribute. Light, Dark or System (follows the OS). A tiny inline script applies the saved theme before first paint, so there is no flash.
- [x] **Animations** - CSS page transitions between sections, shimmer skeletons, loading spinners, card hover lift, animated heart, sliding nav and tab pills, animated list reordering and removals (Framer Motion). All of it is neutralised under `prefers-reduced-motion`.

### 5. State management and logic

- [x] **Redux Toolkit** - five slices (`preferences`, `favorites`, `feedOrder`, `session`, `live`) plus the RTK Query API slice. See [State management](#state-management).
- [x] **Async logic with RTK Query** - paginated endpoints for news, movies, social and search with page merging, de-duplication, caching and retry.
- [x] **Local storage persistence** - preferences (categories, hashtags, theme, language), favorites, feed order and profile are persisted to `localStorage` and rehydrated after mount. Corrupt, old-version or unavailable storage falls back to defaults without crashing.

### 6. Testing

- [x] **Unit tests** - reducers, persistence and hydration edge cases, interleave/order helpers, the debounce hook (fake timers), provider fallbacks, route handlers, auth tokens, SSE timing, security headers and i18n key parity.
- [x] **Integration tests** (React Testing Library + MSW) - feed rendering, empty states, errors with retry, partial failures, infinite scroll, favorites, search, settings, trending, login and the app shell.
- [x] **E2E tests** (Playwright) - end-to-end coverage of the critical user flows the PDF names (search, drag-and-drop reordering, authentication). Specs live in `e2e/` and run with `npm run e2e`.

### 7. Bonus features

- [x] **Authentication** - mock login/sign-up page, signed `httpOnly` session cookie, auth gate for every page and API route, and an editable profile (display name and avatar color) in Settings.
- [x] **Real-time data** - Server-Sent Events from `GET /api/stream` push a new item every 20 seconds (configurable with `?interval=`, clamped 1-60). The feed shows a "N new items" pill; clicking it prepends them. The sidebar "Live" card shows the same count.
- [x] **Multi-language support** - react-i18next with English, Hindi and Spanish, a language menu in the header and a picker in Settings, persisted, with `<html lang>` kept in sync.

### Beyond the brief

- [x] **Accessibility (WCAG AA target)** - skip link, landmarks, visible focus rings, ARIA patterns for combobox/tabs/menus, live regions, 44 px touch targets on primary controls. See [Accessibility](#accessibility).
- [x] **Security** - API keys server-only, validated query parameters, security headers and CSP, hardened session cookie, inert rendering of untrusted text. See [Security](#security).
- [x] **Performance** - debounced search, RTK Query caching, lazy-loaded search palette, memoized cards, layout-stable skeletons, capped page size.

### Evaluation criteria at a glance

| Criterion | Where to look |
|---|---|
| Functionality | The checklist above; [User-flow walkthrough](#user-flow-walkthrough) |
| Code quality | TypeScript `strict`, no `any` in `src/`, small modules, single sources of truth (`navItems.ts`, `contentTypeMeta.ts`, `categories.ts`) |
| UI/UX and accessibility | Editorial design system in `src/app/globals.css`; [Accessibility](#accessibility) |
| State management | `src/store/` (slices, persistence listener, RTK Query); [State management](#state-management) |
| Performance | Debounce, pagination, caching, lazy palette, memoized cards (see [Architecture](#architecture)) |
| Testing | `tests/unit`, `tests/integration`, `e2e/`; [Testing](#testing) |
| Creativity | Command palette, keyboard-accessible drag-and-drop, live pill, bento trending, theme previews in Settings, Devanagari typography |
| Security | [Security](#security) |

---

## Tech stack

| Area | Choice |
|---|---|
| Framework | Next.js 16 (App Router, route handlers, `proxy.ts`), React 19 |
| Language | TypeScript 5, `strict: true`, path alias `@/*` -> `src/*` |
| State | Redux Toolkit 2 (slices + listener middleware), RTK Query, react-redux 9 |
| Styling | Tailwind CSS v4 over CSS custom-property design tokens; fonts Fraunces (headlines), Inter (UI), Noto Sans Devanagari (Hindi) via `next/font` |
| Motion | Framer Motion (`LazyMotion`, `Reorder`, `layoutId`) plus CSS keyframes |
| i18n | i18next + react-i18next (EN / HI / ES) |
| Icons | lucide-react |
| Unit / integration | Vitest 5, React Testing Library, user-event, jest-dom, MSW 2, jsdom |
| E2E | Playwright (Chromium) |
| Data sources | NewsAPI, TMDB (v4 read-access token), seeded mock data |

Requires **Node.js 20.9 or newer** (Next.js 16 requirement) and npm.

---

## Quick start

```bash
# 1. Install dependencies
npm i

# 2. Create your local environment file (keys are optional, see below)
cp .env.example .env.local        # Windows PowerShell: Copy-Item .env.example .env.local

# 3. Start the dev server
npm run dev
```

Open <http://localhost:3000>. You will be redirected to the login page; click **Use demo account**, then **Log in**.

Notes:

- With the keys in `.env.local` left blank, Pulse runs in **mock mode** (seeded news and movies). Add real keys at any time and restart the dev server.
- `npm run dev` uses a built-in development secret for the session cookie if `AUTH_SECRET` is blank (the copied `.env.example` carries a placeholder value, which also works locally). A production build requires a real `AUTH_SECRET` (see below).
- `npm run build` downloads the Google fonts (Fraunces, Inter, Noto Sans Devanagari) at build time, so it needs internet access.
- Mock images are loaded from `picsum.photos`; without internet the cards show their gradient fallback instead.

To run a production build locally, put an `AUTH_SECRET` in `.env.local` first:

```bash
npm run build
npm start
```

---

## Environment variables

All variables are read **on the server only** (route handlers and the auth proxy). None of them is prefixed with `NEXT_PUBLIC_`, so none can reach the browser bundle. Copy `.env.example` to `.env.local`; `.env.local` is git-ignored, `.env.example` is committed.

| Variable | Required? | What it is | When blank |
|---|---|---|---|
| `NEWS_API_KEY` | No | API key from [newsapi.org](https://newsapi.org) (free Developer plan is enough for development). | News is served from seeded mock data. |
| `TMDB_API_KEY` | No | A **TMDB v4 "API Read Access Token"** (the long `eyJ...` bearer token, *not* the short v3 API key). Create a free account at [themoviedb.org](https://www.themoviedb.org), then Settings > API ([direct link](https://www.themoviedb.org/settings/api)). It is sent as `Authorization: Bearer <token>`. | Movies are served from seeded mock data. |
| `AUTH_SECRET` | **Yes in production** | A long random string used to sign the `pulse_session` cookie (HMAC-SHA-256). Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`. `.env.example` ships the placeholder `change-me-to-a-long-random-string`: replace it, and never deploy with it, because anyone who knows the secret can forge a session. | In `npm run dev` a built-in development secret is used. With `NODE_ENV=production` (`npm run build && npm start`, or any production host) and **no** `AUTH_SECRET`, login returns HTTP 500 and every page redirects to `/login` (Pulse fails closed rather than accepting forgeable sessions). |

### Mock mode

Each source decides independently:

- **Key present** -> the real API is called (with an 8-second timeout; upstream responses are cached by Next.js for 5 minutes).
- **Key blank** -> the seeded mock provider answers instead.
- **Key present but the upstream call fails** (HTTP 401/429/500, network error, timeout, malformed JSON) -> the route returns the mock page instead of an error. Route handlers never respond with a 5xx because of an upstream failure.
- **Social** is always mock.

Every `/api/news`, `/api/movies` and `/api/social` response carries an `X-Data-Source: live | mock` header (and a `source` field in the JSON body), so you can see which one you got:

```bash
# (requires a signed-in session cookie; the API is behind the auth gate)
curl -i -b "pulse_session=<value>" "http://localhost:3000/api/news?categories=technology&page=1"
```

---

## Demo credentials

| Email | Password |
|---|---|
| `demo@pulse.dev` | `pulse123` |

The login page has a **Use demo account** button that fills these in for you (it does not submit; press **Log in**). See [Known limitations](#known-limitations) for how the mock auth behaves.

---

## Scripts

| Script | Command it runs | Purpose |
|---|---|---|
| `npm run dev` | `next dev` | Development server on port 3000. |
| `npm run build` | `next build` | Production build (type-checks too). |
| `npm start` | `next start` | Serve the production build. Needs `AUTH_SECRET`. |
| `npm run lint` | `eslint` | ESLint (Next core-web-vitals + TypeScript rules). |
| `npm run typecheck` | `tsc --noEmit` | Strict TypeScript check. |
| `npm test` | `vitest run` | All unit and integration tests, once. |
| `npm run test:watch` | `vitest` | Tests in watch mode. |
| `npm run e2e` | `playwright test` | End-to-end tests (see [Testing](#testing)). |

---

## Architecture

### Data flow

```
 BROWSER (React 19, Redux Toolkit)
 +-------------------------------------------------------------------+
 |  Pages: Feed | Trending | Favorites | Settings | Login            |
 |    |  useFeed, useTrending, SearchPalette, useLiveFeed            |
 |    v                                                              |
 |  Redux store                                                      |
 |    preferences | favorites | feedOrder | session | live           |
 |    RTK Query cache: news | movies | social | search              |
 |    persisted slices <---> localStorage  "pulse:v1"                |
 +--------+------------------------------------------+---------------+
          | fetch /api/*  (same origin, cookie)       | EventSource
          v                                           v   /api/stream
 NEXT.JS SERVER
 +-------------------------------------------------------------------+
 |  src/proxy.ts   verify signed pulse_session cookie                |
 |                 pages -> 307 /login     /api/* -> 401 JSON        |
 |                                                                   |
 |  Route handlers   parseParams(): clamp page 1-5, whitelist        |
 |                   categories, trim q to 100, validate tags        |
 |                                                                   |
 |   /api/news   --> newsProvider   --+                              |
 |   /api/movies --> moviesProvider --+--> withFallback(live, mock)  |
 |   /api/social --> socialProvider --+          |                   |
 |   /api/search  = the three above, page 1,     |                   |
 |                  top 5 each                   |                   |
 |   /api/stream  = SSE: one item / 20 s         |                   |
 +-----------------------------------------------|-------------------+
                       key set and call succeeds | key blank, or the
                                                 | upstream call fails
                          +----------------------+--------------+
                          v                                     v
                  NewsAPI / TMDB                  mockProvider (seeded data)
                  (server-side fetch,             Page { items, nextPage,
                   8 s timeout,                          source: 'mock' }
                   5 min revalidate)
```

Every provider normalizes its output to the same shape:

```ts
ContentItem { id, type: 'news' | 'movie' | 'social', category, title, description,
              image, url, source, author?, publishedAt, score }
Page        { items: ContentItem[], nextPage: number | null, source: 'live' | 'mock' }
```

### Key design decisions

- **Hybrid data layer.** Route handlers own all third-party calls. The browser only ever talks to `/api/*`, which is what keeps the keys private and lets every failure degrade to mock data instead of an error screen.
- **One feed from three sources.** The feed requests news, movies and social pages in parallel and `interleave`s them (round-robin, de-duplicated by id). The user's saved order is applied on top (`applyOrder`); live items that arrived over SSE and have not been placed yet sit at the top.
- **Auth gate in `src/proxy.ts`.** Next.js 16 renamed `middleware` to `proxy`. It guards every page and every API route except `/api/auth/*`; a signed-in user visiting `/login` is bounced to `/`.
- **Plain `<img>` for card images.** NewsAPI returns images from arbitrary hosts, so `next/image` allow-listing is impossible. Images use `loading="lazy"`, `referrerpolicy="no-referrer"`, a fixed aspect-ratio box (no layout shift) and a gradient `onError` fallback.
- **Cache Components is intentionally off** in `next.config.ts` so the route handlers can use classic `export const dynamic` and `fetch(..., { next: { revalidate } })`.
- **CSS-driven page transitions.** The App Router swaps pages instantly, so an exit animation would play on the incoming page; a keyed CSS entrance keyframe gives the same visible effect with no JavaScript and respects reduced motion.
- **Performance.** Debounced search with a 2-character floor; RTK Query caching and page merging; `React.memo` cards; the search palette is a lazily loaded chunk (preloaded on hover, loaded on first open); `LazyMotion` with async feature loading; skeletons that match card geometry; the Devanagari font only downloads when Hindi text is on screen.

---

## Folder structure

```
pulse-dashboard/
|-- .env.example                 Template for .env.local (committed)
|-- next.config.ts               Security headers + CSP, Tailwind loader
|-- vitest.config.ts             jsdom, globals, tests/setup.ts
|-- playwright.config.ts         Chromium, builds + starts the app itself
|-- eslint.config.mjs, tsconfig.json, package.json
|-- docs/superpowers/            Design spec and implementation plan
|-- e2e/                         Playwright specs (npm run e2e)
|-- tests/
|   |-- setup.ts, helpers.tsx, msw.ts      Shared test setup, renderWithStore, MSW handlers
|   |-- unit/                    Reducers, persistence, helpers, providers, routes, auth, SSE, headers, i18n
|   `-- integration/             Feed, cards, favorites, search, settings, trending, login, shell
`-- src/
    |-- proxy.ts                 Auth gate (Next 16 "middleware")
    |-- app/
    |   |-- layout.tsx           Fonts, no-flash theme script, <Providers>
    |   |-- providers.tsx        Redux + i18n + hydrator + theme/language sync
    |   |-- globals.css          Design tokens, Tailwind v4 theme, animations, reduced-motion rules
    |   |-- login/               page.tsx, LoginScreen, LoginHero, LoginForm
    |   |-- (dashboard)/         Shell layout + pages
    |   |   |-- layout.tsx       Sidebar, header, tab bar, skip link, <main>
    |   |   |-- page.tsx         Feed
    |   |   |-- trending/page.tsx
    |   |   |-- favorites/page.tsx
    |   |   `-- settings/page.tsx
    |   `-- api/
    |       |-- news/ movies/ social/ search/ stream/    route.ts each
    |       `-- auth/{login,logout,session}/route.ts
    |-- components/
    |   |-- Sidebar, MobileTabBar, Header, PageHeader, PageTransition, ShellMotion, navItems
    |   |-- ContentCard, CardImage, FavoriteButton, SortableFeed, NewItemsPill, CategoryChips,
    |   |   Skeleton, EmptyState, ErrorState, contentTypeMeta
    |   |-- SearchPalette            Command palette (lazy-loaded)
    |   |-- TrendingBoard, Numeral   Bento trending
    |   |-- AccountMenu, Avatar, ThemeToggle, LanguageSwitch, PulseMark
    |   |-- StoreHydrator, ThemeSync, LanguageSync     Headless sync components
    |   `-- settings/                SettingsSection, ThemePicker, LanguagePicker,
    |                                HashtagEditor, ProfileEditor, SavedToast
    |-- hooks/                       useFeed, useTrending, useLiveFeed, useInfiniteSentinel,
    |                                useSearchShortcut, useMenu, useResolvedTheme, useFavoritesCount
    |-- lib/
    |   |-- types, categories, params, interleave, order, useDebouncedValue
    |   |-- auth (token primitives), i18n, theme, color, avatarColors, hashtags,
    |   |   relativeTime, safeUrl, motion, motionFeatures
    |   `-- server/                  newsProvider, moviesProvider, socialProvider, mockProvider,
    |                                mockData, withFallback, liveItem, authServer
    |-- locales/                     en.json, hi.json, es.json
    `-- store/
        |-- index.ts, hooks.ts, actions.ts, persist.ts, api.ts
        `-- slices/                  preferences, favorites, feedOrder, session, live
```

---

## State management

**Slices**

| Slice | Holds | Persisted |
|---|---|---|
| `preferences` | `categories`, `hashtags`, `theme` (`light`/`dark`/`system`), `language` (`en`/`hi`/`es`) | Yes |
| `favorites` | `byId`: a full `ContentItem` snapshot per favorite | Yes |
| `feedOrder` | `ids`: the user's drag order | Yes |
| `session` | `profile` (display name, avatar color), `email` (from the session cookie), `hydrated` flag | Only `profile` |
| `live` | `pending` (SSE items not yet shown) and `injected` (items revealed by the pill) | No |
| `api` (RTK Query) | Cache for news, movies, social and search | No |

**Persistence**

- Storage key is `pulse:v1`. A listener middleware writes `preferences`, `favorites`, `feedOrder` and `session.profile` whenever one of those references changes, and does nothing for unrelated actions (API cache updates, live items).
- State is **hydrated after mount** (`hydrateAll`, dispatched from `StoreHydrator`), so the first client render matches the server HTML. Nothing is written before hydration, which would otherwise overwrite saved data with defaults. The theme is applied earlier still by an inline script to avoid a flash.
- Loading is defensive: if `localStorage` is unavailable or throws, or holds corrupt JSON, a non-object, or a different version, Pulse starts with defaults. Individual fields are repaired (unknown theme -> `system`, unknown categories dropped, hashtags re-validated, non-hex avatar colors rejected, order ids de-duplicated and capped).

**Behaviors worth knowing**

- `toggleCategory` refuses to remove the last remaining category.
- Favorites store snapshots, so the Favorites page needs no API call and keeps items that have left the feed.
- `applyOrder` ignores ids that are no longer present and appends new arrivals after ordered items.

**RTK Query**

- One endpoint each for news, movies and social, built with a shared `infinite()` helper: all pages of one (categories, tags) combination live in a single cache entry. `merge` appends each new page and de-duplicates by id; page 1 replaces the entry (refresh or changed filters); `forceRefetch` fires when only `page` changed.
- `useFeed` shares one `page` counter across the three sources, resets it to 1 when categories or hashtags change, never skips a failed page (paging pauses and "Try again" repeats the same page), and keeps showing the sources that did load when one fails.
- `search` is keyed by query, so a slow response for an older query can never overwrite newer results.

---

## Testing

At the time of writing: **37 test files, 444 tests** passing under `npm test`.

```bash
npm test                                  # all unit + integration tests, once
npm run test:watch                        # watch mode
npx vitest run tests/unit/persist.test.ts # a single file
npx vitest run -t "debounce"              # tests whose name matches a string
npm run lint && npm run typecheck         # static checks
npm run e2e                               # end-to-end (Playwright)
```

**Unit tests** (`tests/unit/`, Vitest): preferences, favorites, feed order, live and session reducers; persistence and hydration including corrupt, old-version and throwing storage; `interleave` and `applyOrder`; the debounce hook with fake timers; query-parameter parsing and clamping; `withFallback` and the news, movies and mock providers (including 401, network error and malformed-JSON fallbacks); route handlers called directly (including `/api/item`); the `recent` slice and its persistence; `findKnownItem`; `whyShown`; auth token signing and verification, cookie flags and the proxy gate; the SSE stream (headers, interval, heartbeat, timer cleanup); security-header config; i18n key parity across the three languages.

**Integration tests** (`tests/integration/`, React Testing Library + MSW, real Redux store and i18n): the details page (from memory, from the server, not found, favorites, copy link, Back, related items, language), the feed (skeletons, interleaving, empty state, full and partial errors with retry, infinite scroll appends and de-duplicates, saved order, keyboard reordering, live "new items" pill), content cards (CTA per type, hostile URLs and markup rendered inert, image fallbacks), favorites, the search palette (one request per burst of typing, minimum length, no-results, error and retry, keyboard navigation), trending, settings, login and the app shell. MSW intercepts `/api/*`, so no test calls NewsAPI, TMDB or the network.

**End-to-end tests** (Playwright, Chromium): specs live in `e2e/` and run with `npm run e2e`. `e2e/details.spec.ts` covers opening a card, reload, Back, related cards, search and Trending entry points, and bookmarked / unknown ids.

- The first time, install the browser: `npx playwright install chromium`.
- `playwright.config.ts` starts the app itself with `npm run build && npm run start` (injecting a test `AUTH_SECRET`) on port 3000, and reuses a server that is already listening there. Stop any other server on port 3000 if you want a clean production run.
- Failed tests keep a trace under `test-results/` (git-ignored); open one with `npx playwright show-trace <path-to>/trace.zip`.

---

## Accessibility

Built to meet WCAG AA:

- **Keyboard first.** A "Skip to content" link is the first tab stop. Every interactive element has a visible 3 px focus ring (`--ring`). The search palette traps focus, closes with `Esc` and returns focus to its trigger.
- **Landmarks and semantics.** `header`, a labelled `nav` ("Main navigation"), a single `main`, `article` cards labelled by their headline, a proper heading order, `lang` on `<html>` that follows the selected language.
- **Widget patterns.** The search palette is a combobox + listbox with `aria-activedescendant`; Trending uses `tablist`/`tab`/`tabpanel` with roving tabindex; the account and language menus follow the WAI-ARIA menu-button pattern; Settings pickers are native radio groups; the favorite heart is a toggle button (`aria-pressed`).
- **Drag-and-drop without a mouse.** Every feed card has a 44 px drag handle that is a real `<button>`: focus it and press `ArrowUp`/`ArrowDown` to move the card. Moves are announced in a polite live region ("Moved ... to position 2 of 25"), including "already first/last" at the edges.
- **Live regions.** Search status ("Searching...", "N results"), feed move announcements, the new-items pill, the Settings "Saved" toast and form errors (`role="alert"`, `aria-invalid`, `aria-describedby`) are announced to assistive tech.
- **Color and contrast.** Tokens were chosen for AA in both themes; display-size coral text uses a deepened `accent-strong`, error text a derived `danger` token, and input borders are strong enough for the 3:1 non-text rule.
- **Touch targets.** Primary controls (tab bar, heart, drag handle, CTA, menu items) are 44 px; nothing interactive is under 24 px.
- **Reduced motion and transparency.** `prefers-reduced-motion` disables CSS animations and Framer Motion transforms (no hover lift, instant layout moves); `prefers-reduced-transparency` makes glass surfaces opaque; decorative backdrops are hidden in forced-colors mode.
- **Internationalization.** English, Hindi (Noto Sans Devanagari, with Hindi-specific line height and letter-spacing) and Spanish, including correct plural forms.

---

## Security

- **Keys stay on the server.** `NEWS_API_KEY`, `TMDB_API_KEY` and `AUTH_SECRET` are read only in server code and are never `NEXT_PUBLIC_*`, so they cannot appear in the client bundle. `.env.local` is git-ignored; only `.env.example` (no secrets) is committed.
- **Everything is behind the auth gate.** `src/proxy.ts` rejects unauthenticated page requests (redirect to `/login`) and API requests (401 JSON), so the NewsAPI/TMDB-backed routes cannot be used anonymously. It fails closed when `AUTH_SECRET` is missing in production.
- **Session cookie.** `pulse_session` is `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` in production, 7-day `Max-Age`. The value is `base64url(email).HMAC-SHA-256` computed with the Web Crypto API and checked with a constant-time comparison; forged, truncated or oversized tokens verify to "signed out". The dev fallback secret is never used when `NODE_ENV=production`.
- **Input validation on the server.** `page` is clamped to 1-5, `categories` are whitelisted, `q` is trimmed and capped at 100 characters, `tags` must match `[a-z0-9_]{1,30}` (max 10), and the SSE `interval` is clamped to 1-60. Hostile strings (regex metacharacters, HTML) return normal 200 responses.
- **Untrusted content is rendered inert.** React escapes all text; the only `dangerouslySetInnerHTML` is the static pre-paint theme script. Search highlighting is built from split text, not injected HTML. Outbound links accept only `http(s)` URLs (`safeHttpUrl`), open with `rel="noopener noreferrer"`, and images use `referrerpolicy="no-referrer"`. Items arriving over SSE are structurally validated before they reach the store.
- **Security headers** (set for every route in `next.config.ts`, covered by a unit test): `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, and a `Content-Security-Policy` of `default-src 'self'`; `script-src 'self' 'unsafe-inline'` (plus `'unsafe-eval'` only in development); `style-src 'self' 'unsafe-inline'`; `img-src 'self' data: https:`; `font-src 'self' data:`; `connect-src 'self'`; `object-src 'none'`; `frame-ancestors 'none'`; `base-uri 'self'`; `form-action 'self'`. `'unsafe-inline'` for scripts is needed by Next's inline bootstrap and the no-flash theme script; a nonce-based CSP would remove it but forces dynamic rendering on every route.
- **Upstream failures never leak.** Provider errors are swallowed into a mock page; responses never include upstream error text or keys.
- **Resilient client storage.** Corrupt `localStorage` cannot crash or poison the app (see [State management](#state-management)).

---

## Known limitations

- **Social posts are mock.** There is no free public API that returns a hashtag-filterable feed without per-user OAuth, and the PDF allows a mock. Hashtags filter the seeded posts. The live stream is also simulated: `/api/stream` generates items from the seeded data, whether or not you configured API keys.
- **Mock authentication.**
  - Only the demo account (`demo@pulse.dev` / `pulse123`) can log in.
  - Sign-up validates the email format and a 6-128 character password and signs you in, but **stores nothing**: there is no user database, so after signing out that email cannot log in again.
  - The profile (display name, avatar color) is kept in the browser's `localStorage`, not on an account, so it is shared by whoever uses that browser profile.
  - Session tokens carry no expiry claim (only the cookie's 7-day `Max-Age` bounds them), and there is no login rate limiting. This is a gate for a demo, not an identity system; swap in NextAuth.js or a real provider before real use.
  - `AUTH_SECRET` is required in production (see [Environment variables](#environment-variables)).
- **NewsAPI free-plan restrictions.** The free Developer plan is intended for development and testing, is rate-limited (about 100 requests per day at the time of writing), delays articles (about 24 hours) and limits how far back search can go. Pulse requests US top headlines per category (`finance` is served from NewsAPI's `business` category) and English-language search. When NewsAPI answers 401, 426 or 429, Pulse silently falls back to mock news for that request.
- **Recommendations are category-based.** TMDB results come from mapping your categories to genres, sorted by popularity. There is no per-user watch history.
- **Mock data details.** Mock dates are fixed in January 2026 (so they read as "months ago"), mock item links point to placeholder `example.com` URLs, and mock images need internet access to `picsum.photos`. Mock pools are sized for the full 5-page scroll, so single-category views repeat seeds with a "Part N" (or "repost N") marker.
- **Details pages have no full article text.** NewsAPI and TMDB return a teaser, not the body, so the page shows what the item carries and sends you to the original with the call-to-action. The last 24 items you opened are saved in `localStorage` (`recent`), so their URLs keep working after a reload; a bookmark to an item that was never opened in this browser works for the seeded mock catalogue (`GET /api/item`) but, with real NewsAPI / TMDB keys, shows "We couldn't find that item". Opening a feed, Trending or search card links to `/content/<id>` with `prefetch={false}` on purpose, so a long feed does not prefetch a route per card.
- **Pagination cap.** 9 items per source per page and at most 5 pages, by design.
- **SSE on serverless hosts.** Each open tab holds one long-lived connection. Platforms that cap response duration will close it; the browser's `EventSource` reconnects automatically.
- **Language flash.** For a saved Hindi or Spanish preference, the server-rendered HTML is English until hydration (the language is stored client-side). The theme has no such flash.
- **Translations.** Hindi and Spanish copy has not been reviewed by native speakers.
- **Touch drag-and-drop** was verified with emulated touch in Chromium, not on physical iOS or Android hardware.
- **Tablet icon rail** shows labels as hover/focus tooltips only (accessible names are intact).
- **No `next/image`.** Deliberate; see [Architecture](#architecture).

---

## Deployment on Vercel

1. [Publish the project to GitHub](#publishing-to-github).
2. On [vercel.com](https://vercel.com), choose **Add New > Project** and import the repository. Vercel detects Next.js; keep the default install and build commands.
3. Under **Environment Variables**, add:
   - `AUTH_SECRET` - **required** (a long random string; see [Environment variables](#environment-variables)). Vercel builds run with `NODE_ENV=production`, so without it nobody can log in.
   - `NEWS_API_KEY` and `TMDB_API_KEY` - optional. Leave them out to deploy in mock mode.
4. Click **Deploy**, then open the URL and log in with the [demo credentials](#demo-credentials).

Notes:

- Environment-variable changes only apply to new deployments; redeploy after changing them.
- NewsAPI's free plan is meant for development; for a public deployment, mock mode (or a paid plan) is the safer choice.
- The SSE stream may be closed by the platform's maximum function duration; the client reconnects on its own.
- CLI alternative: `npx vercel` (preview) and `npx vercel --prod`, with `npx vercel env add AUTH_SECRET production` for the secret.

---

## User-flow walkthrough

1. **Open the app.** Visit `/`. You are not signed in, so you land on `/login`.
2. **Sign in.** Click **Use demo account** (fills `demo@pulse.dev` / `pulse123` and moves focus to the submit button), then **Log in**. The **Sign up** tab accepts any valid email and a password of 6 or more characters (mock; nothing is stored). Wrong credentials show an inline alert.
3. **Browse the feed.** You see news, movies and posts interleaved for the default categories (Technology, Sports, Finance) and hashtags (`#tech`, `#design`). Use the category chips above the list to filter quickly; the last category cannot be removed. Scroll to load more; skeletons and a spinner show progress, and "You're all caught up." marks the end.
4. **Open or read.** Click a card to open its **details page** (`/content/...`): context, score, why it is in your feed, related items, **Copy link** and **Back**. The call-to-action on a card or on the details page (**Read more**, **Play now**, **View post**) opens the original in a new tab.
5. **Reorder.** Drag a card by its grip handle, or focus the handle and press `ArrowUp`/`ArrowDown`. Reload the page: your order is still there.
6. **Favorite.** Click the heart on a card. Open **Favorites** from the sidebar to see it; filter by News / Movies / Posts; click the heart again to remove it. Your favorites survive reloads and even stay after the item leaves the feed.
7. **Search.** Press `/` (or `Ctrl`/`Cmd` + `K`, or click the header search). Type at least 2 characters; after a 300 ms pause, grouped News / Movies / Posts results appear. Use `ArrowUp`/`ArrowDown` to move through them, `Enter` to open its details page, `Esc` to close.
8. **Trending.** Open **Trending** and switch between News, Movies and Posts (arrow keys work on the tabs). The top five are tiles, ranks 6-10 are listed under "Also rising".
9. **Live updates.** Stay on the feed for about 20 seconds: a **"1 new item"** pill appears under the header. Click it to prepend the new item(s) and scroll to the top. The sidebar "Live" card shows the same count.
10. **Personalize.** Open **Settings** to change categories and hashtags (the feed updates; categories also drive Trending), choose **Light / Dark / System**, pick a **language**, and edit your **display name and avatar color**. Everything saves automatically ("Saved" toast).
11. **Theme and language shortcuts.** The header has a sun/moon button for light/dark and a language menu (English, Hindi, Español).
12. **Sign out.** Open the avatar menu in the header and choose **Sign out**; you return to `/login`.

---

## Publishing to GitHub

These steps are for you to run yourself; nothing in this repository runs them for you. The project folder is not a git repository yet.

**Before you start (optional but recommended):** the repository may contain local tooling folders from development (`.superpowers/`, `.claude/`) with screenshots and notes. If you do not want them on GitHub, add these two lines to `.gitignore` first:

```
.superpowers/
.claude/
```

`node_modules/`, `.next/` and `.env.local` are already ignored, so your keys will not be committed.

**1. Create an empty repository on GitHub.** Go to <https://github.com/new>, name it (for example `pulse-dashboard`), set it to **Public** (the assignment asks for a public repository), and do **not** add a README, license or `.gitignore` (the project already has them). Create the repository.

**2. Tell git who you are** (skip if already configured):

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

**3. Initialize, commit and push** from the project folder:

```bash
cd path/to/pulse-dashboard

git init -b main
git add .
git status          # check: no .env.local, no node_modules, no .next in the list
git commit -m "Add Pulse personalized content dashboard"

git remote add origin https://github.com/<your-username>/pulse-dashboard.git
git push -u origin main
```

If you use the GitHub CLI (`gh`), you can skip step 1 on the website and the last two commands above. After `git commit`, run:

```bash
gh repo create pulse-dashboard --public --source=. --remote=origin --push
```

**Clear commit history.** The assignment asks for a clear commit history. If you would rather not use a single commit, make several logical commits before pushing. Individual commits will not each build on their own, which is fine for a first push:

```bash
git init -b main
git add package.json package-lock.json tsconfig.json next.config.ts eslint.config.mjs vitest.config.ts playwright.config.ts .gitignore .env.example AGENTS.md
git commit -m "Scaffold Next.js app, tooling and configuration"
git add src/lib src/proxy.ts src/app/api
git commit -m "Add providers, mock data, auth and API routes"
git add src/store src/locales
git commit -m "Add Redux store, persistence, RTK Query and translations"
git add src/app src/components src/hooks
git commit -m "Add dashboard UI: feed, trending, favorites, settings, search"
git add tests e2e
git commit -m "Add unit, integration and E2E tests"
git add README.md docs
git commit -m "Add README and project docs"
git status          # should now be clean (apart from .superpowers/ and .claude/ if you did not ignore them)
git remote add origin https://github.com/<your-username>/pulse-dashboard.git
git push -u origin main
```

**4. After pushing.** [Deploy to Vercel](#deployment-on-vercel), then put the live URL at the top of this README and add a short demo video, as the assignment's submission guidelines ask (repository link, README, optional demo video and live link).
