import type { ReactElement, ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import { render, type RenderOptions } from '@testing-library/react';
import { LanguageSync } from '@/components/LanguageSync';
import i18n from '@/lib/i18n';
import { makeStore, type AppStore, type RootState } from '@/store';
import { hydrateAll } from '@/store/actions';

interface Options extends Omit<RenderOptions, 'wrapper'> {
  preloaded?: Partial<RootState>;
  store?: AppStore;
}

/**
 * Renders `ui` inside the same provider stack as the app: Redux <Provider> -> <I18nextProvider>
 * -> <LanguageSync/> (so dispatching `setLanguage` re-renders translated text). Dispatches
 * `hydrateAll({})` first so persistence is active (writes to localStorage are gated on hydration).
 * tests/setup.ts resets the shared i18n instance to English after every test.
 */
export function renderWithStore(ui: ReactElement, { preloaded, store = makeStore(preloaded), ...opts }: Options = {}) {
  store.dispatch(hydrateAll({}));
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>
      <I18nextProvider i18n={i18n}>
        <LanguageSync />
        {children}
      </I18nextProvider>
    </Provider>
  );
  return { store, ...render(ui, { wrapper: Wrapper, ...opts }) };
}

export * from '@testing-library/react';
