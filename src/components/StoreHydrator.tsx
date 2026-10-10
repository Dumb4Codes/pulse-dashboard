'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { loadPersisted } from '@/store/persist';
import { hydrateAll } from '@/store/actions';
import { useAppDispatch, useAppStore } from '@/store/hooks';
import { setSessionEmail } from '@/store/slices/session';

const isLoginRoute = (pathname: string | null) => pathname === '/login' || (pathname?.startsWith('/login/') ?? false);

/** Reads `{ email }` out of the session endpoint's JSON without trusting its shape. */
function readEmail(data: unknown): string | null {
  if (typeof data === 'object' && data !== null && 'email' in data) {
    const { email } = data as { email: unknown };
    if (typeof email === 'string' && email) return email;
  }
  return null;
}

/**
 * Client-only bootstrap, run after mount so the first client render matches the server HTML:
 *  1. load `pulse:v1` from localStorage into the store (also opens the persistence gate);
 *  2. ask `/api/auth/session` who is signed in.
 * Step 2 skips `/login` (nobody is signed in there; it would only log a 401) and re-runs when the
 * user crosses between the login page and the app, so the email appears right after sign-in. It
 * deliberately does not depend on the stored email: signing out clears it, and re-asking the
 * server at that moment would just produce a 401.
 */
export function StoreHydrator() {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const pathname = usePathname();
  const onLogin = isLoginRoute(pathname);

  useEffect(() => {
    dispatch(hydrateAll(loadPersisted()));
  }, [dispatch]);

  useEffect(() => {
    if (onLogin || store.getState().session.email) return;
    const controller = new AbortController();
    fetch('/api/auth/session', { credentials: 'same-origin', signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: unknown) => {
        const email = readEmail(data);
        if (email) dispatch(setSessionEmail(email));
      })
      .catch(() => {
        // Offline or aborted: the account menu just omits the email.
      });
    return () => controller.abort();
  }, [dispatch, store, onLogin]);

  return null;
}
