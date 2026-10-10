'use client';

import { LazyMotion, MotionConfig, domAnimation } from 'framer-motion';
import { LoginForm } from './LoginForm';
import { LoginHero } from './LoginHero';

/**
 * Client boundary for the login route. LazyMotion + `m` keeps the Framer bundle to the
 * `domAnimation` feature set (no drag/layout projection needed here), and
 * `reducedMotion="user"` makes every transform animation instant for users who ask for less motion.
 */
export function LoginScreen() {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <main
          id="main"
          className="grid min-h-dvh gap-3 p-3 sm:gap-4 sm:p-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]"
        >
          <LoginHero />
          <LoginForm />
        </main>
      </MotionConfig>
    </LazyMotion>
  );
}
