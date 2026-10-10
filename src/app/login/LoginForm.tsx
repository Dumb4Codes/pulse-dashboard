'use client';

import { useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, m } from 'framer-motion';
import { AlertCircle, ArrowRight, Eye, EyeOff, LoaderCircle, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  DEMO_EMAIL,
  DEMO_PASSWORD,
  MIN_PASSWORD_LENGTH,
  isValidEmail,
  type AuthMode,
} from '@/lib/auth';
import { DURATION, EASE_IN, EASE_OUT } from '@/lib/motion';

// i18n keys, kept as literal maps (not template strings) so they stay greppable and the
// key-existence test in tests/unit/i18n.test.tsx can verify every one of them.
const MODE_KEYS = {
  login: { title: 'auth.loginTitle', subtitle: 'auth.loginSubtitle', submit: 'auth.login', pending: 'auth.loginPending' },
  signup: { title: 'auth.signupTitle', subtitle: 'auth.signupSubtitle', submit: 'auth.signupSubmit', pending: 'auth.signupPending' },
} as const;

const FIELD_ERROR_KEYS = {
  emailRequired: 'auth.error.emailRequired',
  email: 'auth.error.email',
  passwordRequired: 'auth.error.passwordRequired',
  password: 'auth.error.password',
} as const;

const FORM_ERROR_KEYS = {
  invalid: 'auth.invalid',
  network: 'auth.error.network',
  server: 'auth.error.server',
} as const;

type FieldName = 'email' | 'password';
type FieldErrorKind = keyof typeof FIELD_ERROR_KEYS;
/** Errors are stored as kinds, not text, so a visible message re-translates if the language changes. */
type FieldErrors = Partial<Record<FieldName, FieldErrorKind>>;
type FormErrorKind = keyof typeof FORM_ERROR_KEYS;

function fieldError(field: FieldName, value: string, mode: AuthMode): FieldErrorKind | undefined {
  if (field === 'email') {
    if (!value.trim()) return 'emailRequired';
    return isValidEmail(value) ? undefined : 'email';
  }
  if (!value) return 'passwordRequired';
  if (mode === 'signup' && value.length < MIN_PASSWORD_LENGTH) return 'password';
  return undefined;
}

function readErrorKey(data: unknown): string {
  if (typeof data === 'object' && data !== null && 'error' in data) {
    const { error } = data as { error: unknown };
    if (typeof error === 'string') return error;
  }
  return '';
}

const INPUT_CLASS =
  'h-12 w-full rounded-xl border border-ink/50 bg-surface px-4 text-base text-ink placeholder:text-muted ' +
  'transition-colors hover:border-ink/70 focus-visible:border-accent-2 aria-invalid:border-danger';

export function LoginForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const uid = useId();
  const ids = {
    email: `${uid}-email`,
    emailError: `${uid}-email-error`,
    password: `${uid}-password`,
    passwordError: `${uid}-password-error`,
    passwordHint: `${uid}-password-hint`,
    formError: `${uid}-form-error`,
  };

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<FormErrorKind | null>(null);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState('');

  const keys = MODE_KEYS[mode];
  const passwordRejected = formError === 'invalid';
  const interpolation = { min: MIN_PASSWORD_LENGTH };

  function switchMode(next: AuthMode) {
    if (next === mode) return;
    setMode(next);
    setErrors({});
    setFormError(null);
    setStatus(t(MODE_KEYS[next].title));
  }

  /** Validate on blur; once a field has an error, re-validate as the user types so it clears. */
  function validateOnBlur(field: FieldName, value: string) {
    setErrors((prev) => ({ ...prev, [field]: fieldError(field, value, mode) }));
  }

  function onEmailChange(e: ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setEmail(value);
    setFormError(null);
    if (errors.email) setErrors((prev) => ({ ...prev, email: fieldError('email', value, mode) }));
  }

  function onPasswordChange(e: ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setPassword(value);
    setFormError(null);
    if (errors.password) setErrors((prev) => ({ ...prev, password: fieldError('password', value, mode) }));
  }

  function fillDemo() {
    setMode('login');
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setShowPassword(false);
    setErrors({});
    setFormError(null);
    setStatus(t('auth.demoFilled'));
    submitRef.current?.focus();
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;

    const next: FieldErrors = {
      email: fieldError('email', email, mode),
      password: fieldError('password', password, mode),
    };
    setErrors(next);
    setFormError(null);
    if (next.email) {
      emailRef.current?.focus();
      return;
    }
    if (next.password) {
      passwordRef.current?.focus();
      return;
    }

    setPending(true);
    setStatus(t(keys.pending));
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ mode, email, password }),
      });

      if (res.ok) {
        // Stay in the pending state: the page is about to be replaced.
        setStatus(t('auth.signedIn'));
        router.replace('/');
        return;
      }

      const key = readErrorKey(await res.json().catch(() => null));
      if (res.status === 400 && key === 'email') {
        setErrors({ email: 'email' });
        emailRef.current?.focus();
      } else if (res.status === 400 && key === 'password') {
        setErrors({ password: 'password' });
        passwordRef.current?.focus();
      } else if (res.status === 401) {
        setFormError('invalid');
        passwordRef.current?.focus();
        passwordRef.current?.select();
      } else {
        setFormError('server');
      }
    } catch {
      setFormError('network');
    }
    setStatus('');
    setPending(false);
  }

  const passwordDescribedBy =
    [
      errors.password ? ids.passwordError : mode === 'signup' ? ids.passwordHint : null,
      formError ? ids.formError : null,
    ]
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <div className="flex items-center justify-center px-1 py-8 sm:px-6 sm:py-12 lg:px-10 lg:py-0">
      <div className="w-full max-w-[28rem] animate-enter-left rounded-[calc(var(--radius)+8px)] border border-line bg-surface p-6 shadow-[var(--shadow)] [animation-delay:150ms] sm:p-7">
        <form noValidate method="post" onSubmit={onSubmit}>
          <fieldset className="relative grid grid-cols-2 rounded-xl border border-line bg-surface-2 p-1">
            <legend className="sr-only">{t('auth.modeLabel')}</legend>
            <span
              aria-hidden="true"
              className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-lg border border-line bg-surface shadow-sm transition-transform duration-300 ease-out-expo ${
                mode === 'signup' ? 'translate-x-full' : ''
              }`}
            />
            {(['login', 'signup'] as const).map((value) => (
              <label key={value} className="relative z-10 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  value={value}
                  checked={mode === value}
                  onChange={() => switchMode(value)}
                  className="peer sr-only"
                />
                <span className="flex h-11 items-center justify-center rounded-lg text-sm font-medium text-muted transition-colors hover:text-ink peer-checked:text-ink peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--ring)]">
                  {t(value === 'login' ? 'auth.login' : 'auth.signup')}
                </span>
              </label>
            ))}
          </fieldset>

          <div className="mt-7 min-h-[5.75rem]">
            <AnimatePresence mode="wait" initial={false}>
              <m.div
                key={mode}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0, transition: { duration: DURATION.enter * 0.6, ease: EASE_OUT } }}
                exit={{ opacity: 0, y: -6, transition: { duration: DURATION.micro, ease: EASE_IN } }}
              >
                <h1 className="font-display text-[1.625rem] font-medium leading-tight tracking-[-0.02em] text-balance sm:text-4xl">
                  {t(keys.title)}
                </h1>
                <p className="mt-2 text-pretty text-muted">{t(keys.subtitle)}</p>
              </m.div>
            </AnimatePresence>
          </div>

          <div className="mt-4">
            <label htmlFor={ids.email} className="mb-1.5 block text-sm font-medium">
              {t('auth.email')}
            </label>
            <input
              ref={emailRef}
              id={ids.email}
              name="email"
              type="email"
              inputMode="email"
              autoComplete={mode === 'login' ? 'username' : 'email'}
              enterKeyHint="next"
              autoCapitalize="none"
              spellCheck={false}
              required
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChange={onEmailChange}
              onBlur={() => validateOnBlur('email', email)}
              aria-invalid={errors.email ? 'true' : undefined}
              aria-describedby={errors.email ? ids.emailError : undefined}
              className={INPUT_CLASS}
            />
            <div className="mt-1.5 min-h-5 text-sm">
              {errors.email && (
                <p id={ids.emailError} role="alert" className="flex items-start gap-1.5 text-danger">
                  <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  {t(FIELD_ERROR_KEYS[errors.email], interpolation)}
                </p>
              )}
            </div>
          </div>

          <div className="mt-2">
            <label htmlFor={ids.password} className="mb-1.5 block text-sm font-medium">
              {t('auth.password')}
            </label>
            <div className="relative">
              <input
                ref={passwordRef}
                id={ids.password}
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                enterKeyHint="go"
                autoCapitalize="none"
                spellCheck={false}
                required
                value={password}
                onChange={onPasswordChange}
                onBlur={() => validateOnBlur('password', password)}
                aria-invalid={errors.password || passwordRejected ? 'true' : undefined}
                aria-describedby={passwordDescribedBy}
                className={`${INPUT_CLASS} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                className="absolute right-0.5 top-0.5 grid size-11 place-items-center rounded-[10px] text-muted transition-colors hover:bg-surface-2 hover:text-ink"
              >
                {showPassword ? (
                  <EyeOff aria-hidden="true" className="size-5" />
                ) : (
                  <Eye aria-hidden="true" className="size-5" />
                )}
              </button>
            </div>
            <div className="mt-1.5 min-h-5 text-sm">
              {errors.password ? (
                <p id={ids.passwordError} role="alert" className="flex items-start gap-1.5 text-danger">
                  <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  {t(FIELD_ERROR_KEYS[errors.password], interpolation)}
                </p>
              ) : (
                mode === 'signup' && (
                  <p id={ids.passwordHint} className="text-muted">
                    {t('auth.passwordHint', interpolation)}
                  </p>
                )
              )}
            </div>
          </div>

          <AnimatePresence initial={false}>
            {formError && (
              <m.div
                key="form-error"
                id={ids.formError}
                role="alert"
                className="overflow-hidden"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto', transition: { duration: DURATION.enter * 0.6, ease: EASE_OUT } }}
                exit={{ opacity: 0, height: 0, transition: { duration: DURATION.micro, ease: EASE_IN } }}
              >
                <p className="mt-2 flex items-start gap-2 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
                  <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  {t(FORM_ERROR_KEYS[formError])}
                </p>
              </m.div>
            )}
          </AnimatePresence>

          <button
            ref={submitRef}
            type="submit"
            aria-disabled={pending}
            className="group mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-ink text-base font-medium text-bg transition-[transform,box-shadow] duration-200 hover:shadow-[0_14px_30px_-14px_var(--accent)] active:scale-[0.985] aria-disabled:cursor-progress aria-disabled:opacity-80 aria-disabled:hover:shadow-none"
          >
            {pending ? (
              <>
                <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
                {t(keys.pending)}
              </>
            ) : (
              <>
                {t(keys.submit)}
                <ArrowRight
                  aria-hidden="true"
                  className="size-5 transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </>
            )}
          </button>

          <p role="status" className="sr-only">
            {status}
          </p>
        </form>

        <div className="mt-6 flex flex-col gap-3 rounded-xl border border-dashed border-line p-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 text-sm">
            <p className="font-medium">{t('auth.demoHeading')}</p>
            <p className="mt-1 font-mono text-xs leading-relaxed text-muted">
              {DEMO_EMAIL}
              <br />
              {DEMO_PASSWORD}
            </p>
          </div>
          <button
            type="button"
            onClick={fillDemo}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-3.5 text-sm font-medium transition-colors hover:border-accent-2 hover:bg-surface-2"
          >
            <Sparkles aria-hidden="true" className="size-4 text-accent-2" />
            {t('auth.demo')}
          </button>
        </div>

        <p className="mt-5 text-center text-xs text-muted">{t('auth.footnote')}</p>
      </div>
    </div>
  );
}
