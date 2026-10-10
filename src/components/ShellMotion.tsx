'use client';

import type { ReactNode } from 'react';
import { LazyMotion, MotionConfig } from 'framer-motion';

const loadFeatures = () => import('@/lib/motionFeatures').then((mod) => mod.default);

/**
 * Motion context for the whole dashboard subtree: `m` components get their features (incl. layout
 * projection for `layoutId` and drag for Reorder) from an async chunk, and `reducedMotion="user"`
 * turns transform/layout animation off for visitors who ask for less motion.
 *
 * Deliberately NOT `strict`: the feed's `Reorder.Group/Item` are full `motion` components and a
 * strict LazyMotion would throw on them.
 */
export function ShellMotion({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
