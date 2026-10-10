import { CATEGORIES } from '@/lib/categories';
import { parseParams } from '@/lib/params';
import { MOVIE_SEEDS, NEWS_SEEDS, NEWS_SOURCES, SOCIAL_SEEDS } from '@/lib/server/mockData';
import { mockPage } from '@/lib/server/mockProvider';

const P = (s = '') => parseParams(new URLSearchParams(s));
const hashtags = (text: string) => text.match(/#[a-z0-9_]+/gi) ?? [];

describe('mock seed minimums', () => {
  it('has >= 8 distinct news seeds per category', () => {
    for (const c of CATEGORIES) {
      expect(NEWS_SEEDS[c].length).toBeGreaterThanOrEqual(8);
      expect(new Set(NEWS_SEEDS[c].map(s => s.title)).size).toBe(NEWS_SEEDS[c].length);
    }
    expect(NEWS_SOURCES.length).toBeGreaterThan(3);
  });
  it('has >= 24 movies spread across every category', () => {
    expect(MOVIE_SEEDS.length).toBeGreaterThanOrEqual(24);
    for (const c of CATEGORIES) expect(MOVIE_SEEDS.some(m => m.category === c)).toBe(true);
  });
  it('has >= 40 social posts with 1-3 hashtags, >= 4 per category, #tech in >= 6', () => {
    expect(SOCIAL_SEEDS.length).toBeGreaterThanOrEqual(40);
    for (const s of SOCIAL_SEEDS) {
      expect(hashtags(s.text).length).toBeGreaterThanOrEqual(1);
      expect(hashtags(s.text).length).toBeLessThanOrEqual(3);
    }
    for (const c of CATEGORIES) expect(SOCIAL_SEEDS.filter(s => s.category === c).length).toBeGreaterThanOrEqual(4);
    expect(SOCIAL_SEEDS.filter(s => hashtags(s.text).some(h => h.toLowerCase() === '#tech')).length).toBeGreaterThanOrEqual(6);
  });
});

describe('mock pagination depth', () => {
  it.each(['news', 'movie', 'social'] as const)('%s: 5 full pages of unique items across all categories', (t) => {
    const items = [1, 2, 3, 4, 5].flatMap(n => mockPage(t, P(`page=${n}`)).items);
    expect(items).toHaveLength(45);
    expect(new Set(items.map(i => i.id)).size).toBe(45);
    if (t !== 'social') expect(new Set(items.map(i => i.title)).size).toBe(45);
  });
  it.each(['news', 'movie', 'social'] as const)('%s: a single category can still reach page 5', (t) => {
    expect(mockPage(t, P('categories=sports&page=5')).items).toHaveLength(9);
  });
  it('alternates categories on page 1', () => {
    expect(mockPage('news', P()).items.slice(0, 7).map(i => i.category)).toEqual([...CATEGORIES]);
  });
  it('tag filtering respects hashtag boundaries and is ignored for news', () => {
    expect(mockPage('social', P('tags=tec')).items).toEqual([]);
    expect(mockPage('news', P('tags=zzz')).items).toHaveLength(9);
  });
  it('items are well-formed', () => {
    for (const t of ['news', 'movie', 'social'] as const) {
      for (const i of mockPage(t, P()).items) {
        expect(i).toMatchObject({ type: t });
        expect(i.image).toMatch(/^https:\/\/picsum\.photos\/seed\//);
        expect(Number.isNaN(Date.parse(i.publishedAt))).toBe(false);
        expect(i.score).toBeGreaterThanOrEqual(0);
        expect(i.score).toBeLessThan(100);
      }
    }
  });
});

describe('narrowing queries do not list repeated editions', () => {
  it('q: every hit is a first-edition item with a unique title', () => {
    const items = [1, 2, 3, 4, 5].flatMap(n => mockPage('news', P(`q=a&page=${n}`)).items);
    expect(items.every(i => i.id.endsWith('-0'))).toBe(true);
    expect(new Set(items.map(i => i.title)).size).toBe(items.length);
  });
  it('tags: #tech lists each distinct post once and ends', () => {
    const r = mockPage('social', P('tags=tech'));
    expect(r.items.length).toBeGreaterThanOrEqual(6);
    expect(new Set(r.items.map(i => i.id)).size).toBe(r.items.length);
    expect(r.nextPage).toBeNull();
  });
});
