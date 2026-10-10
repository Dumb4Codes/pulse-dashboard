'use client';

import { useId, useState } from 'react';
import clsx from 'clsx';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AVATAR_COLORS } from '@/lib/avatarColors';
import { readableOn } from '@/lib/color';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { updateProfile } from '@/store/slices/session';
import { Avatar } from '../Avatar';

const MAX_NAME = 40;

type NameError = 'required' | 'tooLong';

function validateName(raw: string): NameError | null {
  // UTF-16 length, the same measure the persistence layer uses when it reloads the name.
  const { length } = raw.trim();
  if (length < 1) return 'required';
  if (length > MAX_NAME) return 'tooLong';
  return null;
}

/**
 * Display name and avatar colour, with a live preview of the avatar the header will show.
 *
 * Both save as you go. The name field keeps what was typed (`draft`) until it loses focus, while
 * the store gets the trimmed value, and only when it is valid: an empty or over-long name shows an
 * inline error (`aria-invalid` + `aria-describedby`) and leaves the last good name in place, so the
 * preview and the header never show something invalid. `draft` is `null` until the first edit, so
 * the field follows the store (which is only hydrated from localStorage after mount).
 */
export function ProfileEditor({ onSaved }: { onSaved: () => void }) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const profile = useAppSelector((s) => s.session.profile);
  const email = useAppSelector((s) => s.session.email);
  const [draft, setDraft] = useState<string | null>(null);
  const uid = useId();
  const nameId = `${uid}-name`;
  const errorId = `${uid}-name-error`;
  const colorLabelId = `${uid}-color`;
  const colorName = `${uid}-avatar`;

  const shown = draft ?? profile.name;
  const problem = draft === null ? null : validateName(draft);

  function onNameChange(raw: string) {
    setDraft(raw);
    if (validateName(raw) !== null) return;
    const name = raw.trim();
    if (name === profile.name) return;
    dispatch(updateProfile({ name }));
    onSaved();
  }

  const current = profile.avatarColor.toLowerCase();

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:gap-10">
      <div className="flex items-center gap-4 md:flex-col md:items-start md:gap-3">
        <Avatar
          data-avatar-preview=""
          name={profile.name}
          color={profile.avatarColor}
          className="size-20 text-4xl ring-4 ring-surface-2 transition-colors duration-300 md:size-24 md:text-5xl"
        />
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted [:lang(hi)_&]:tracking-normal">
            {t('settings.preview')}
          </p>
          <p className="mt-1 truncate font-display text-xl/[1.3] font-medium tracking-[-0.01em]">{profile.name}</p>
          {email ? <p className="truncate text-sm text-muted">{email}</p> : null}
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-7">
        <div>
          <label htmlFor={nameId} className="mb-2 block text-sm font-medium">
            {t('settings.name')}
          </label>
          <input
            id={nameId}
            type="text"
            inputMode="text"
            enterKeyHint="done"
            autoComplete="name"
            spellCheck={false}
            value={shown}
            aria-invalid={problem ? true : undefined}
            aria-describedby={problem ? errorId : undefined}
            onChange={(event) => onNameChange(event.target.value)}
            onBlur={() => {
              // Back to the stored (trimmed) name once the field is valid; an invalid draft stays so the error remains explained.
              if (draft !== null && validateName(draft) === null) setDraft(null);
            }}
            className="h-12 w-full rounded-xl border border-ink/50 bg-surface px-4 text-base text-ink transition-colors placeholder:text-muted hover:border-ink/70 focus-visible:border-accent-2 aria-invalid:border-danger"
          />
          {problem ? (
            <p id={errorId} role="alert" className="mt-2 text-sm font-medium text-danger">
              {problem === 'required' ? t('settings.nameRequired') : t('settings.nameTooLong', { max: MAX_NAME })}
            </p>
          ) : null}
        </div>

        <div>
          <p id={colorLabelId} className="mb-3 text-sm font-medium">
            {t('settings.avatarColor')}
          </p>
          <div role="radiogroup" aria-labelledby={colorLabelId} className="flex flex-wrap gap-3">
            {AVATAR_COLORS.map(({ key, hex }) => {
              const checked = current === hex;
              return (
                <label key={key} className="relative block cursor-pointer">
                  <input
                    type="radio"
                    name={colorName}
                    value={hex}
                    checked={checked}
                    onChange={() => {
                      dispatch(updateProfile({ avatarColor: hex }));
                      onSaved();
                    }}
                    className="peer sr-only"
                  />
                  {/* The swatch colour is the user's data (a hex that is persisted), so it is an inline style. */}
                  <span
                    aria-hidden="true"
                    style={{ backgroundColor: hex }}
                    className={clsx(
                      'grid size-11 place-items-center rounded-full ring-offset-2 ring-offset-surface transition-[box-shadow,transform] duration-200 hover:scale-105 peer-active:scale-95',
                      'peer-focus-visible:outline-3 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-(--ring)',
                      checked ? 'ring-2 ring-ink' : 'ring-1 ring-ink/15',
                      readableOn(hex) === 'dark' ? 'text-black' : 'text-white',
                    )}
                  >
                    <Check
                      className={clsx('size-5 transition-opacity duration-150', checked ? 'opacity-100' : 'opacity-0')}
                      strokeWidth={3}
                    />
                  </span>
                  <span className="sr-only">{t(`settings.colors.${key}`)}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
