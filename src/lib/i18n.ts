import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '@/locales/en.json';
import es from '@/locales/es.json';
import hi from '@/locales/hi.json';

/**
 * Single shared i18next instance. Locale JSON is bundled (no async backend), so `init` is
 * synchronous and `t()` is usable on the very first render, server and client.
 * The active language is driven by `preferences.language` through `<LanguageSync/>`, which is the
 * only place that calls `changeLanguage`. The server never changes it, so the module-level
 * instance stays on English there and cannot leak one request's language into another.
 *
 * `en.json` is the source of truth. Plurals use i18next JSON v4 suffixes (`key_one`, `key_other`,
 * plus `key_many` for Spanish); tests/unit/i18n.test.tsx enforces key parity across the files.
 */
if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      es: { translation: es },
    },
    lng: 'en',
    fallbackLng: 'en',
    initAsync: false,
    interpolation: { escapeValue: false }, // React already escapes rendered text
    react: { useSuspense: false },
  });
}

export default i18n;
