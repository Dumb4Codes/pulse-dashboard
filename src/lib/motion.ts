/**
 * Shared Framer Motion timing. Import these instead of retyping curves per component.
 * `EASE_OUT` mirrors `--ease-out-expo` in globals.css so JS and CSS motion feel like one system.
 * Rules of thumb: micro 150-200ms, entrances 400-600ms, exits ~0.7x the entrance, ambient loops 8-20s.
 */
type Bezier = [number, number, number, number];

export const EASE_OUT: Bezier = [0.16, 1, 0.3, 1];
export const EASE_IN: Bezier = [0.7, 0, 0.84, 0];
export const EASE_IN_OUT: Bezier = [0.65, 0, 0.35, 1];

export const DURATION = {
  micro: 0.18,
  enter: 0.5,
  exit: 0.35,
} as const;

/** Snappy UI spring (active-nav pill, badge pop). Critically damped enough not to visibly overshoot. */
export const SPRING_SNAPPY = { type: 'spring', stiffness: 400, damping: 32 } as const;

/** Playful micro-reward (favourite heart): a single, small overshoot, then settled. */
export const SPRING_POP = { type: 'spring', stiffness: 520, damping: 17, mass: 0.8 } as const;

/** Card lift on pointer hover: weightier than a button press, no overshoot. */
export const SPRING_LIFT = { type: 'spring', stiffness: 300, damping: 28 } as const;
