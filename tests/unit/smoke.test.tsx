import { render, screen } from '@testing-library/react';

// Tooling smoke test: proves vitest globals, jsdom, jest-dom matchers, the `@/*` alias
// config and the jsdom shims in tests/setup.ts all work. Safe to delete once real tests exist.
describe('tooling smoke', () => {
  it('renders with RTL and has jsdom shims', () => {
    render(<p>hello</p>);
    expect(screen.getByText('hello')).toBeInTheDocument();
    expect(window.matchMedia('(prefers-color-scheme: dark)').matches).toBe(false);
    expect(new IntersectionObserver(() => {})).toBeTruthy();
    expect(window.location.origin).toBe('http://localhost:3000');
    localStorage.setItem('pulse:v1', '{}');
  });
  it('clears localStorage between tests', () => {
    expect(localStorage.getItem('pulse:v1')).toBeNull();
  });
});
