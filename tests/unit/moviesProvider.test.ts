import { getMovies } from '@/lib/server/moviesProvider';
import { parseParams } from '@/lib/params';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
const P = (s = '') => parseParams(new URLSearchParams(s));
const okJson = (body: unknown) => vi.fn<(url: string, init: RequestInit) => Promise<Response>>(async () => new Response(JSON.stringify(body)));

it('uses mock when TMDB_API_KEY is absent', async () => {
  vi.stubEnv('TMDB_API_KEY', '');
  expect((await getMovies(P())).source).toBe('mock');
});

it('maps TMDB results, skipping posterless ones, and sends a Bearer token', async () => {
  vi.stubEnv('TMDB_API_KEY', 'tok');
  const fetchMock = okJson({
    total_pages: 40,
    results: [
      { id: 11, title: 'Doc', overview: 'O', poster_path: '/p.jpg', release_date: '2020-05-01', vote_average: 7.46, genre_ids: [99] },
      { id: 12, title: 'No poster', overview: 'O', poster_path: null, release_date: '2020-05-01', vote_average: 5, genre_ids: [99] },
    ],
  });
  vi.stubGlobal('fetch', fetchMock);
  const r = await getMovies(P());
  expect(r.source).toBe('live');
  expect(r.items).toHaveLength(1);
  expect(r.nextPage).toBe(2);
  expect(r.items[0]).toMatchObject({
    id: 'movie-11', type: 'movie', category: 'sports', score: 75,
    image: 'https://image.tmdb.org/t/p/w780/p.jpg', url: 'https://www.themoviedb.org/movie/11',
  });
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toContain('/discover/movie');
  expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
});

it('uses /search/movie when q is set and ends at the last upstream page', async () => {
  vi.stubEnv('TMDB_API_KEY', 'tok');
  const fetchMock = okJson({ total_pages: 1, results: [{ id: 1, title: 'Dune', poster_path: '/d.jpg', genre_ids: [878] }] });
  vi.stubGlobal('fetch', fetchMock);
  const r = await getMovies(P('q=dune'));
  expect(r.source).toBe('live');
  expect(r.nextPage).toBeNull();
  expect(fetchMock.mock.calls[0][0]).toContain('/search/movie?query=dune');
});

it('falls back to mock on HTTP 401, network error and malformed JSON', async () => {
  vi.stubEnv('TMDB_API_KEY', 'tok');
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 401 })));
  expect((await getMovies(P())).source).toBe('mock');
  vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('network'); }));
  expect((await getMovies(P())).source).toBe('mock');
  vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>')));
  expect((await getMovies(P())).source).toBe('mock');
});
