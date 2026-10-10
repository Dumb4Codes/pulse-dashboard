import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
// Registers the shared i18next instance with react-i18next so `useTranslation()` works in any
// test, with or without <I18nextProvider>. Components under test render real English strings.
import i18n from '@/lib/i18n';

afterEach(async () => {
  cleanup();
  localStorage.clear();
  // Tests that switch language must not leak into the next test.
  if (i18n.language !== 'en') await i18n.changeLanguage('en');
  document.documentElement.lang = 'en';
});
// jsdom lacks these:
class IO { observe(){} unobserve(){} disconnect(){} takeRecords(){return []} }
(globalThis as any).IntersectionObserver ??= IO;
window.matchMedia ??= ((q: string) => ({ matches:false, media:q, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){}, onchange:null, dispatchEvent(){return false} })) as any;
