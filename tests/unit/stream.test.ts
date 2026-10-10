import { NextRequest } from 'next/server';
import { GET } from '@/app/api/stream/route';
import { CATEGORIES } from '@/lib/categories';
import { makeLiveItem, parseInterval } from '@/lib/server/liveItem';
import type { ContentItem } from '@/lib/types';

const decoder = new TextDecoder();

function open(path = '/api/stream', controller = new AbortController()) {
  const req = new NextRequest(`http://localhost:3000${path}`, { signal: controller.signal });
  return GET(req).then((res) => ({ res, controller, reader: res.body!.getReader() }));
}

type Reader = ReadableStreamDefaultReader<Uint8Array>;
const next = async (reader: Reader) => {
  const { value, done } = await reader.read();
  return done ? null : decoder.decode(value);
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('GET /api/stream', () => {
  it('answers as an uncached, unbuffered event stream', async () => {
    const { res, controller } = await open();
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
    expect(res.headers.get('Cache-Control')).toBe('no-cache, no-transform');
    expect(res.headers.get('Connection')).toBe('keep-alive');
    controller.abort();
  });

  it('opens with a comment so the connection is established immediately', async () => {
    const { reader, controller } = await open();
    expect(await next(reader)).toMatch(/^: /);
    controller.abort();
  });

  it('emits a fresh ContentItem as a data event every `interval` seconds', async () => {
    const { reader, controller } = await open('/api/stream?interval=2');
    await next(reader); // greeting

    await vi.advanceTimersByTimeAsync(1999);
    await vi.advanceTimersByTimeAsync(1);
    const first = await next(reader);
    expect(first).toMatch(/^data: [^\n]+\n\n$/);
    const a = JSON.parse(first!.replace(/^data: /, '')) as ContentItem;
    expect(a.id).toMatch(/^live-\d+$/);
    expect(['news', 'social']).toContain(a.type);
    expect(CATEGORIES).toContain(a.category);
    expect(a.title.length).toBeGreaterThan(0);
    expect(new Date(a.publishedAt).getTime()).toBe(Date.now());
    expect(a.url).toMatch(/^https:\/\//);

    await vi.advanceTimersByTimeAsync(2000);
    const b = JSON.parse((await next(reader))!.replace(/^data: /, '')) as ContentItem;
    expect(b.id).not.toBe(a.id);
    // The mix cycles between news and posts.
    expect(b.type).not.toBe(a.type);
    controller.abort();
  });

  it('defaults to a 20 second interval', async () => {
    const { reader, controller } = await open();
    await next(reader);

    await vi.advanceTimersByTimeAsync(14_999);
    await vi.advanceTimersByTimeAsync(1); // 15s: heartbeat only
    expect(await next(reader)).toBe(': ping\n\n');

    await vi.advanceTimersByTimeAsync(4_999);
    await vi.advanceTimersByTimeAsync(1); // 20s: first item
    expect(await next(reader)).toMatch(/^data: /);
    controller.abort();
  });

  it('treats an out-of-range interval as the nearest bound (0 -> every second)', async () => {
    const { reader, controller } = await open('/api/stream?interval=0');
    await next(reader);

    await vi.advanceTimersByTimeAsync(1000);
    expect(await next(reader)).toMatch(/^data: /);
    controller.abort();
  });

  it('sends a heartbeat comment every 15 seconds', async () => {
    const { reader, controller } = await open('/api/stream?interval=60');
    await next(reader);

    await vi.advanceTimersByTimeAsync(15_000);
    expect(await next(reader)).toBe(': ping\n\n');
    await vi.advanceTimersByTimeAsync(15_000);
    expect(await next(reader)).toBe(': ping\n\n');
    controller.abort();
  });

  it('clears its timers and closes the stream when the client goes away', async () => {
    const { reader, controller } = await open('/api/stream?interval=1');
    await next(reader);
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    controller.abort();

    expect(await reader.read()).toEqual({ value: undefined, done: true });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('clears its timers when the consumer cancels the stream', async () => {
    const { reader } = await open('/api/stream?interval=1');
    await next(reader);

    await reader.cancel();

    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not start timers for a request that is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const { reader } = await open('/api/stream', controller);

    expect(vi.getTimerCount()).toBe(0);
    await next(reader); // greeting, if any
    expect(await reader.read()).toEqual({ value: undefined, done: true });
  });
});

describe('parseInterval', () => {
  it.each([
    [null, 20],
    ['', 20],
    ['abc', 20],
    ['NaN', 20],
    ['2', 2],
    ['2.9', 2],
    ['0', 1],
    ['0.4', 1],
    ['-5', 1],
    ['60', 60],
    ['999', 60],
    ['Infinity', 60],
  ])('%s -> %s seconds', (raw, seconds) => {
    expect(parseInterval(raw)).toBe(seconds);
  });
});

describe('makeLiveItem', () => {
  it('alternates news and posts, cycles categories, and stamps the given time', () => {
    const now = Date.UTC(2026, 9, 8, 12, 0, 0);
    const items = Array.from({ length: 14 }, (_, n) => makeLiveItem(n, now + n));

    expect(items.map((i) => i.type)).toEqual(Array.from({ length: 14 }, (_, n) => (n % 2 === 0 ? 'news' : 'social')));
    expect(new Set(items.map((i) => i.id)).size).toBe(14);
    expect(items[0].id).toBe(`live-${now}`);
    for (const item of items) {
      expect(CATEGORIES).toContain(item.category);
      expect(item.title).not.toBe('');
      expect(item.description).not.toBe('');
      expect(item.publishedAt).toBe(new Date(now + items.indexOf(item)).toISOString());
    }
    // Every category appears among the news items.
    expect(new Set(items.filter((i) => i.type === 'news').map((i) => i.category)).size).toBe(CATEGORIES.length);
  });
});
