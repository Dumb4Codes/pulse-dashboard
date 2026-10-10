'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Route-change entrance: opacity + 8px rise over 220ms (`animate-page-in`, CSS keyframes).
 * Keying on the pathname remounts the wrapper, which replays the animation on every navigation.
 *
 * CSS rather than an AnimatePresence exit/enter pair on purpose: the App Router swaps `children`
 * the instant the URL changes, so an "exit" would play on the incoming page; and a Framer
 * `initial={{ opacity: 0 }}` would ship the page as invisible HTML until hydration. The keyframe
 * runs on first paint, needs no JS, and the global prefers-reduced-motion rule neutralises it.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-page-in">
      {children}
    </div>
  );
}
