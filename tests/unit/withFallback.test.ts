import { withFallback } from '@/lib/server/withFallback';
const mock = () => ({ items: [], nextPage: null, source: 'mock' as const });
const live = { items: [], nextPage: 2, source: 'live' as const };
it('uses mock when no live provider', async () => expect((await withFallback(null, mock)).source).toBe('mock'));
it('returns live when it succeeds', async () => expect((await withFallback(async () => live, mock)).source).toBe('live'));
it.each(['401','429','500','network','bad json'])('falls back on %s', async (m) =>
  expect((await withFallback(async () => { throw new Error(m); }, mock)).source).toBe('mock'));
