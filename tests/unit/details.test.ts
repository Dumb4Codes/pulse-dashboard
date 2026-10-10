import { NextRequest } from 'next/server';
import { GET as getItem } from '@/app/api/item/route';
import { contentHref, readContentId } from '@/lib/contentPath';
import { formatDate } from '@/lib/formatDate';
import { findMockItem, mockPage } from '@/lib/server/mockProvider';
import type { ContentItem } from '@/lib/types';
import { whyShown } from '@/lib/whyShown';
import { makeStore } from '@/store';
import { hydrateAll } from '@/store/actions';
import { api } from '@/store/api';
import { loadPersisted, STORAGE_KEY } from '@/store/persist';
import { findKnownItem } from '@/store/selectors';
import { toggleFavorite } from '@/store/slices/favorites';
import { liveReceived, flushLive } from '@/store/slices/live';
import reducer, { itemViewed, MAX_RECENT } from '@/store/slices/recent';
import { makeItem } from '../msw';

const req = (id: string) => new NextRequest(`http://localhost:3000/api/item?id=${encodeURIComponent(id)}`);

describe('content paths', () => {
  it('encodes opaque ids into the URL and reads them back', () => {
    expect(contentHref('news-technology-0-0')).toBe('/content/news-technology-0-0');
    expect(contentHref('news-a/b c?d')).toBe('/content/news-a%2Fb%20c%3Fd');
    expect(readContentId('news-a%2Fb%20c%3Fd')).toBe('news-a/b c?d');
  });

  it('never throws on a malformed escape or a missing / repeated param', () => {
    expect(readContentId('%E0%A4%A')).toBe('%E0%A4%A');
    expect(readContentId(undefined)).toBe('');
    expect(readContentId(['a', 'b'])).toBe('a');
  });
});

describe('formatDate', () => {
  it('formats in the requested language', () => {
    expect(formatDate('2026-10-08T12:00:00.000Z', 'en')).toMatch(/2026/);
    expect(formatDate('2026-10-08T12:00:00.000Z', 'es')).not.toBe(formatDate('2026-10-08T12:00:00.000Z', 'en'));
  });

  it('returns "" for an unparseable value, the epoch sentinel, and falls back on a malformed locale', () => {
    expect(formatDate('nope', 'en')).toBe('');
    expect(formatDate(new Date(0).toISOString(), 'en')).toBe('');
    expect(formatDate('2026-10-08T12:00:00.000Z', 'not a locale!!')).toMatch(/2026/);
  });
});

describe('whyShown', () => {
  const news = makeItem('n', { category: 'health' });
  const post = makeItem('p', { type: 'social', category: 'technology', title: '@dev', description: 'Shipping with #AI and #typescript today' });

  it('names a followed category', () => {
    expect(whyShown(makeItem('x', { category: 'sports' }), ['sports', 'finance'], [])).toEqual({ kind: 'category' });
  });

  it('says "other" when the category is not followed', () => {
    expect(whyShown(news, ['sports'], ['ai'])).toEqual({ kind: 'other' });
  });

  it('prefers a followed hashtag a post mentions, matched case-insensitively and on a hashtag boundary', () => {
    expect(whyShown(post, ['technology'], ['ai'])).toEqual({ kind: 'hashtag', tag: 'ai' });
    expect(whyShown(post, ['technology'], ['type'])).toEqual({ kind: 'category' }); // #type is not #typescript
  });

  it('only applies hashtags to posts', () => {
    const story = makeItem('s', { category: 'health', description: 'A story about #ai' });
    expect(whyShown(story, ['sports'], ['ai'])).toEqual({ kind: 'other' });
  });
});

describe('mock catalogue lookup', () => {
  it('rebuilds any item the mock pages serve, identical to what the feed shows', () => {
    for (const type of ['news', 'movie', 'social'] as const) {
      const [first] = mockPage(type, { page: 1, categories: ['technology', 'sports'], q: '', tags: [] }).items;
      expect(findMockItem(first.id)).toEqual(first);
    }
  });

  it('returns a copy, so callers cannot change the catalogue', () => {
    const item = findMockItem('news-technology-0-0');
    expect(item).not.toBeNull();
    item!.title = 'tampered';
    expect(findMockItem('news-technology-0-0')?.title).not.toBe('tampered');
  });

  it.each(['live-1760000000000', 'news-AbC_123-xyz', 'movie-bogus-0-0', 'news-technology-999-0', 'news-technology-0-99', '', '../etc/passwd'])(
    'does not know %j',
    (id) => expect(findMockItem(id)).toBeNull(),
  );
});

describe('GET /api/item', () => {
  it('returns a mock item by id', async () => {
    const [movie] = mockPage('movie', { page: 1, categories: ['entertainment'], q: '', tags: [] }).items;
    const res = await getItem(req(movie.id));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(movie);
  });

  it('answers 404 for a well-formed id it cannot rebuild (live wire, real API ids)', async () => {
    for (const id of ['live-1760000000000', 'news-AbC_123-xyz']) {
      expect((await getItem(req(id))).status).toBe(404);
    }
  });

  it('answers 400 for a missing or malformed id, without touching the catalogue', async () => {
    for (const id of ['', 'a b', '<script>', 'x'.repeat(81), 'a/b']) {
      expect((await getItem(req(id))).status).toBe(400);
    }
    expect((await getItem(new NextRequest('http://localhost:3000/api/item'))).status).toBe(400);
  });
});

describe('recent slice', () => {
  const a = makeItem('a');
  const b = makeItem('b');

  it('puts the newest first and moves a reopened item to the front without duplicating it', () => {
    let state = reducer(undefined, itemViewed(a));
    state = reducer(state, itemViewed(b));
    expect(state.items.map((i) => i.id)).toEqual(['b', 'a']);
    state = reducer(state, itemViewed({ ...a, title: 'fresher snapshot' }));
    expect(state.items.map((i) => i.id)).toEqual(['a', 'b']);
    expect(state.items[0].title).toBe('fresher snapshot');
  });

  it('keeps only the newest MAX_RECENT', () => {
    let state = reducer(undefined, { type: 'init' });
    for (let i = 0; i < MAX_RECENT + 5; i++) state = reducer(state, itemViewed(makeItem(`i${i}`)));
    expect(state.items).toHaveLength(MAX_RECENT);
    expect(state.items[0].id).toBe(`i${MAX_RECENT + 4}`);
    expect(state.items.at(-1)?.id).toBe('i5');
  });

  it('is saved with the rest of the state and loaded back after a reload', () => {
    const store = makeStore();
    store.dispatch(hydrateAll({}));
    store.dispatch(itemViewed(a));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).recent.items[0].id).toBe('a');

    const reloaded = makeStore();
    reloaded.dispatch(hydrateAll(loadPersisted()));
    expect(reloaded.getState().recent.items.map((i) => i.id)).toEqual(['a']);
  });

  it('repairs what it loads: drops malformed and duplicate entries and caps the length', () => {
    const many = Array.from({ length: MAX_RECENT + 10 }, (_, i) => makeItem(`m${i}`));
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ v: 1, recent: { items: [a, a, { id: 'broken' }, 7, null, ...many] } }),
    );
    const { recent } = loadPersisted();
    expect(recent?.items[0].id).toBe('a');
    expect(recent?.items.filter((i) => i.id === 'a')).toHaveLength(1);
    expect(recent?.items.some((i) => i.id === 'broken')).toBe(false);
    expect(recent?.items).toHaveLength(MAX_RECENT);
  });

  it('is omitted, not defaulted, when storage has no usable value (older saves keep working)', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, preferences: { theme: 'dark' }, recent: 'nope' }));
    expect(Object.keys(loadPersisted())).toEqual(['preferences']);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, recent: { items: 'nope' } }));
    expect(loadPersisted().recent).toBeUndefined();
  });
});

describe('findKnownItem', () => {
  const page = (items: ContentItem[]) => ({ items, nextPage: null, source: 'mock' as const });

  it('finds an item in favorites, recent, the live wire and cached pages, and returns the stored object', async () => {
    const store = makeStore();
    store.dispatch(hydrateAll({}));
    const fav = makeItem('fav');
    const recent = makeItem('recent');
    const pending = makeItem('pending');
    const injected = makeItem('injected');
    const cached = makeItem('cached');
    const searched = makeItem('searched', { type: 'movie' });

    store.dispatch(toggleFavorite(fav));
    store.dispatch(itemViewed(recent));
    store.dispatch(liveReceived(injected));
    store.dispatch(flushLive());
    store.dispatch(liveReceived(pending));
    await store.dispatch(api.util.upsertQueryData('getNews', { categories: ['technology'], page: 1 }, page([cached])));
    await store.dispatch(api.util.upsertQueryData('search', { q: 'zz' }, { news: [], movies: [searched], social: [] }));
    await store.dispatch(api.util.upsertQueryData('getItem', { id: 'one' }, makeItem('one')));

    const state = store.getState();
    expect(findKnownItem(state, 'fav')).toBe(state.favorites.byId.fav);
    expect(findKnownItem(state, 'recent')).toBe(state.recent.items[0]);
    expect(findKnownItem(state, 'injected')?.id).toBe('injected');
    expect(findKnownItem(state, 'pending')?.id).toBe('pending');
    expect(findKnownItem(state, 'cached')?.id).toBe('cached');
    expect(findKnownItem(state, 'searched')?.type).toBe('movie');
    expect(findKnownItem(state, 'one')?.id).toBe('one');
    expect(findKnownItem(state, 'nowhere')).toBeNull();
  });
});
