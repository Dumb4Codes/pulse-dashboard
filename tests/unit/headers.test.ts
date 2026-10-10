import nextConfig from '../../next.config';

type HeaderRule = { source: string; headers: { key: string; value: string }[] };

async function loadRules(): Promise<HeaderRule[]> {
  expect(typeof nextConfig.headers).toBe('function');
  return (await nextConfig.headers!()) as HeaderRule[];
}

/** Header values of the rule that covers every route, keyed by (case-sensitive) header name. */
async function globalHeaders(): Promise<Record<string, string>> {
  const rules = await loadRules();
  const rule = rules.find((r) => r.source === '/(.*)');
  expect(rule, 'a rule whose source matches all routes').toBeDefined();
  return Object.fromEntries(rule!.headers.map((h) => [h.key, h.value]));
}

/** `Content-Security-Policy` split into directive name -> source list. */
function directives(csp: string): Record<string, string[]> {
  return Object.fromEntries(
    csp
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [name, ...sources] = part.split(/\s+/);
        return [name, sources];
      }),
  );
}

describe('security headers (next.config.ts)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('applies one rule to all routes', async () => {
    const rules = await loadRules();
    expect(rules).toHaveLength(1);
    expect(rules[0].source).toBe('/(.*)');
  });

  it('sends the static hardening headers with the expected values', async () => {
    const h = await globalHeaders();
    expect(h['X-Content-Type-Options']).toBe('nosniff');
    expect(h['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(h['X-Frame-Options']).toBe('DENY');
    expect(h['Permissions-Policy']).toBe('camera=(), microphone=(), geolocation=()');
    expect(h['Content-Security-Policy']).toBeTruthy();
  });

  it('has a CSP that allows what the app needs and nothing wider', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const csp = directives((await globalHeaders())['Content-Security-Policy']);

    expect(csp['default-src']).toEqual(["'self'"]);
    // Card thumbnails come from arbitrary https hosts; data: covers inline SVG/grain.
    expect(csp['img-src']).toEqual(["'self'", 'data:', 'https:']);
    expect(csp['style-src']).toEqual(["'self'", "'unsafe-inline'"]);
    expect(csp['font-src']).toEqual(["'self'", 'data:']);
    // Same-origin only: /api/* fetches and the /api/stream EventSource.
    expect(csp['connect-src']).toEqual(["'self'"]);
    expect(csp['frame-ancestors']).toEqual(["'none'"]);
    expect(csp['base-uri']).toEqual(["'self'"]);
    expect(csp['form-action']).toEqual(["'self'"]);
    expect(csp['object-src']).toEqual(["'none'"]);
  });

  it("allows 'unsafe-eval' for scripts in development only", async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const prod = directives((await globalHeaders())['Content-Security-Policy']);
    expect(prod['script-src']).toEqual(["'self'", "'unsafe-inline'"]);

    vi.stubEnv('NODE_ENV', 'development');
    const dev = directives((await globalHeaders())['Content-Security-Policy']);
    expect(dev['script-src']).toEqual(["'self'", "'unsafe-inline'", "'unsafe-eval'"]);
  });

  it('never allows remote scripts or wildcard sources', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const csp = directives((await globalHeaders())['Content-Security-Policy']);
    for (const name of ['default-src', 'script-src', 'style-src', 'connect-src', 'font-src']) {
      expect(csp[name], name).not.toContain('*');
      expect(csp[name], name).not.toContain('https:');
    }
  });
});
