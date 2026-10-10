'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, LoaderCircle, LogOut, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMenu } from '@/hooks/useMenu';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setSessionEmail } from '@/store/slices/session';
import { Avatar } from './Avatar';

const ITEM_CLASS =
  'flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[0.9375rem] font-medium text-ink transition-colors hover:bg-ink/5 focus-visible:bg-ink/5 aria-disabled:cursor-progress aria-disabled:opacity-70';

/** Header avatar menu: identity, link to Settings, and sign-out (`POST /api/auth/logout`, then `/login`). */
export function AccountMenu() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const profile = useAppSelector((s) => s.session.profile);
  const email = useAppSelector((s) => s.session.email);
  const { open, close, rootRef, triggerRef, menuRef, triggerProps, menuProps } = useMenu();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function signOut() {
    if (pending) return;
    setPending(true);
    setFailed(false);
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
      if (!res.ok) throw new Error(`logout failed: ${res.status}`);
      dispatch(setSessionEmail(null));
      // Stay in the pending state: this whole shell is about to be replaced by the login page.
      router.replace('/login');
    } catch {
      setFailed(true);
      setPending(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        {...triggerProps}
        aria-label={t('account.menu')}
        className="grid size-11 place-items-center rounded-full transition-transform active:scale-95"
      >
        <Avatar name={profile.name} color={profile.avatarColor} className="size-9 text-base ring-2 ring-surface" />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-72 max-w-[calc(100vw-1.5rem)] origin-top-right animate-menu-in rounded-2xl border border-line bg-surface p-1 shadow-[var(--shadow)]">
          <div role="group" aria-label={t('account.profile')} className="flex items-center gap-3 px-3 py-3">
            <Avatar name={profile.name} color={profile.avatarColor} className="size-10 text-lg" />
            <div className="min-w-0">
              <p className="truncate text-[0.9375rem] font-medium">{profile.name}</p>
              {email && <p className="truncate text-sm text-muted">{email}</p>}
            </div>
          </div>

          <div ref={menuRef} {...menuProps} className="border-t border-line pt-1">
            <Link href="/settings" role="menuitem" tabIndex={-1} onClick={() => close(false)} className={ITEM_CLASS}>
              <Settings aria-hidden="true" className="size-4.5 text-muted" strokeWidth={1.75} />
              {t('nav.settings')}
            </Link>
            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              aria-disabled={pending}
              onClick={signOut}
              className={ITEM_CLASS}
            >
              {pending ? (
                <LoaderCircle aria-hidden="true" className="size-4.5 animate-spin text-muted" />
              ) : (
                <LogOut aria-hidden="true" className="size-4.5 text-muted" strokeWidth={1.75} />
              )}
              {pending ? t('account.signingOut') : t('account.signOut')}
            </button>
          </div>

          {failed && (
            <p role="alert" className="flex items-start gap-2 px-3 pb-2 pt-1 text-sm text-danger">
              <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              {t('account.signOutError')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
