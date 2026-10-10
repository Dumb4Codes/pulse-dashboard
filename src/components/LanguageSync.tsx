'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '@/store/hooks';

/** Keeps i18next and `<html lang>` in step with `preferences.language`. */
export function LanguageSync() {
  const { i18n } = useTranslation();
  const language = useAppSelector((s) => s.preferences.language);

  useEffect(() => {
    void i18n.changeLanguage(language);
    document.documentElement.lang = language;
  }, [i18n, language]);

  return null;
}
