import type { NextConfig } from "next";

/**
 * Content-Security-Policy, built per call so `NODE_ENV` is read when Next asks for the headers
 * (dev server vs. production build), not when this module is first imported.
 *
 * - `'unsafe-inline'` scripts: Next's inline bootstrap/flight payload and the pre-paint theme script
 *   in `src/app/layout.tsx` are inline. A nonce would remove this, but needs dynamic rendering on
 *   every route; deliberately not done here.
 * - `'unsafe-eval'` only in development (React's debug tooling uses eval; production never does).
 * - `'unsafe-inline'` styles: Framer Motion and Tailwind arbitrary values write inline `style`.
 * - `img-src https:`: card thumbnails come from arbitrary NewsAPI/TMDB hosts (plain `<img>`).
 * - `connect-src 'self'`: every fetch and the `/api/stream` EventSource are same-origin.
 */
function contentSecurityPolicy(): string {
  const isDev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

const nextConfig: NextConfig = {
  // NOTE: the create-next-app scaffold enabled `cacheComponents` + `partialPrefetching`.
  // They are intentionally omitted: Pulse's route handlers use classic segment config
  // (`export const dynamic = 'force-dynamic'`, `fetch(..., { next: { revalidate } })`),
  // which errors under Cache Components.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy", value: contentSecurityPolicy() },
        ],
      },
    ];
  },
};

export default nextConfig;
