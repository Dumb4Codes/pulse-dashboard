"use client";

import { useState, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { Provider } from "react-redux";
import { LanguageSync } from "@/components/LanguageSync";
import { StoreHydrator } from "@/components/StoreHydrator";
import { ThemeSync } from "@/components/ThemeSync";
import i18n from "@/lib/i18n";
import { makeStore } from "@/store";

/**
 * App-wide providers (wraps the login page and the dashboard alike):
 * Redux store -> i18n -> the three headless syncs (persistence/session hydration, language, theme).
 * The store is created once per mounted app (lazy `useState` initialiser), never at module level,
 * so server renders never share state between requests.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [store] = useState(() => makeStore());

  return (
    <Provider store={store}>
      <I18nextProvider i18n={i18n}>
        <StoreHydrator />
        <LanguageSync />
        <ThemeSync />
        {children}
      </I18nextProvider>
    </Provider>
  );
}
