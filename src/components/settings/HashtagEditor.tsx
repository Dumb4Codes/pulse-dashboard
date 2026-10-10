'use client';

import { useId, useState, type FormEvent } from 'react';
import { Hash, Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MAX_HASHTAGS, parseHashtag } from '@/lib/hashtags';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setHashtags } from '@/store/slices/preferences';

type TagError = { kind: 'invalid' } | { kind: 'duplicate'; tag: string } | { kind: 'limit' };

/**
 * The hashtags that pull posts into the feed: a removable chip per tag, and one field to add more.
 *
 * Input is normalised before it is stored (`#Tech ` becomes `tech`) and anything that is not
 * letters, digits or underscores (markup included) is refused with a message under the field,
 * wired through `aria-invalid` / `aria-describedby` and announced as an alert. Validation runs on
 * submit (Enter or Add); the message clears as soon as the person edits the field. Adds and
 * removals save at once. Errors are kept as data, not text, so they re-translate with the language.
 */
export function HashtagEditor({ onSaved }: { onSaved: () => void }) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const hashtags = useAppSelector((s) => s.preferences.hashtags);
  const [value, setValue] = useState('');
  const [error, setError] = useState<TagError | null>(null);
  const uid = useId();
  const inputId = `${uid}-input`;
  const errorId = `${uid}-error`;

  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const tag = parseHashtag(value);
    if (!tag) return setError({ kind: 'invalid' });
    if (hashtags.includes(tag)) return setError({ kind: 'duplicate', tag });
    if (hashtags.length >= MAX_HASHTAGS) return setError({ kind: 'limit' });
    dispatch(setHashtags([...hashtags, tag]));
    setValue('');
    setError(null);
    onSaved();
  }

  function remove(tag: string) {
    dispatch(setHashtags(hashtags.filter((existing) => existing !== tag)));
    setError(null);
    onSaved();
  }

  const message = !error
    ? null
    : error.kind === 'invalid'
      ? t('settings.hashtagInvalid')
      : error.kind === 'duplicate'
        ? t('settings.hashtagDuplicate', { tag: error.tag })
        : t('settings.hashtagLimit', { max: MAX_HASHTAGS });

  return (
    <div>
      <ul role="list" aria-label={t('settings.hashtagList')} className="flex min-h-10 flex-wrap items-center gap-2">
        {hashtags.map((tag) => (
          <li
            key={tag}
            className="inline-flex h-10 animate-rise-sm items-center rounded-full border border-line bg-surface-2 pl-3.5 pr-1 text-sm font-medium"
          >
            <span className="min-w-0 max-w-[16rem] truncate">#{tag}</span>
            <button
              type="button"
              onClick={() => remove(tag)}
              aria-label={t('settings.hashtagRemove', { tag })}
              className="relative ml-1 grid size-8 shrink-0 place-items-center rounded-full text-muted transition-colors after:absolute after:-inset-1.5 after:content-[''] hover:bg-ink/10 hover:text-ink active:scale-90"
            >
              <X aria-hidden="true" className="size-4" strokeWidth={2} />
            </button>
          </li>
        ))}
        {hashtags.length === 0 ? <li className="text-sm text-muted">{t('settings.hashtagEmpty')}</li> : null}
      </ul>

      <form onSubmit={add} noValidate className="mt-5">
        <label htmlFor={inputId} className="mb-2 block text-sm font-medium">
          {t('settings.hashtagLabel')}
        </label>
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Hash
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
              strokeWidth={2}
            />
            <input
              id={inputId}
              type="text"
              inputMode="text"
              enterKeyHint="done"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={value}
              placeholder={t('settings.hashtagPlaceholder')}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              onChange={(event) => {
                setValue(event.target.value);
                if (error) setError(null);
              }}
              className="h-12 w-full rounded-xl border border-ink/50 bg-surface pl-10 pr-4 text-base text-ink transition-colors placeholder:text-muted hover:border-ink/70 focus-visible:border-accent-2 aria-invalid:border-danger"
            />
          </div>
          <button
            type="submit"
            className="inline-flex h-12 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-ink px-5 text-sm font-medium text-bg transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.98]"
          >
            <Plus aria-hidden="true" className="size-4" strokeWidth={2.25} />
            {t('settings.hashtagAdd')}
          </button>
        </div>
        {message ? (
          <p id={errorId} role="alert" className="mt-2 text-sm font-medium text-danger">
            {message}
          </p>
        ) : null}
      </form>
    </div>
  );
}
