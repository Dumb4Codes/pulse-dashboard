import { expect, test, type Page } from '@playwright/test';
import { feedCards, loginToFeed, navLink } from './helpers';

// Pin the OS preference so the default ("system") deterministically resolves to light.
test.use({ colorScheme: 'light' });

const html = (page: Page) => page.locator('html');

test.describe('theme', () => {
  test('toggling dark mode sets html[data-theme=dark], and a reload comes up dark with no light flash', async ({
    page,
  }) => {
    await loginToFeed(page);
    await expect(html(page)).toHaveAttribute('data-theme', 'light');

    const toggle = page.getByRole('button', { name: 'Dark mode' });
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await toggle.click();
    await expect(html(page)).toHaveAttribute('data-theme', 'dark');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');

    // Reload and read the attribute the moment the document has been parsed: the inline script in
    // <head> has run by then, but React has typically not hydrated yet, so this is the pre-paint value.
    await page.reload({ waitUntil: 'domcontentloaded' });
    const initial = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(initial).toBe('dark');

    // And it is still dark once the app is up.
    await expect(page.getByRole('button', { name: 'Dark mode' })).toHaveAttribute('aria-pressed', 'true');
    await expect(html(page)).toHaveAttribute('data-theme', 'dark');
  });

  test('data-theme is never "light" at any point while a dark preference loads', async ({ page }) => {
    await loginToFeed(page);
    await page.getByRole('button', { name: 'Dark mode' }).click();
    await expect(html(page)).toHaveAttribute('data-theme', 'dark');

    // Record every value the attribute takes from the very start of the next document.
    await page.addInitScript(() => {
      const seen: Array<string | undefined> = [];
      (window as unknown as { __themeHistory: Array<string | undefined> }).__themeHistory = seen;
      // <html> does not exist yet when init scripts run, so observe the document and watch the subtree.
      new MutationObserver(() => seen.push(document.documentElement.dataset.theme)).observe(document, {
        attributes: true,
        subtree: true,
        attributeFilter: ['data-theme'],
      });
    });
    await page.reload();
    await expect(page.getByRole('button', { name: 'Dark mode' })).toHaveAttribute('aria-pressed', 'true');
    await expect(feedCards(page).first()).toBeVisible();

    const history = await page.evaluate(
      () => (window as unknown as { __themeHistory: Array<string | undefined> }).__themeHistory,
    );
    expect(history.length).toBeGreaterThan(0);
    expect(history).not.toContain('light');
  });

  test('the choice is persisted and Settings offers Light / Dark / System', async ({ page }) => {
    await loginToFeed(page);
    await navLink(page, 'Settings').click();
    await expect(page).toHaveURL(/\/settings$/);

    const themes = page.getByRole('radiogroup', { name: 'Theme' });
    await themes.getByRole('radio', { name: 'Dark' }).check({ force: true });
    await expect(html(page)).toHaveAttribute('data-theme', 'dark');

    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('pulse:v1') ?? '{}'));
    expect(stored.preferences.theme).toBe('dark');

    await themes.getByRole('radio', { name: 'Light' }).check({ force: true });
    await expect(html(page)).toHaveAttribute('data-theme', 'light');
  });

  test('switching the language to Español translates the sidebar ("Favoritos") and persists', async ({ page }) => {
    await loginToFeed(page);
    await expect(navLink(page, /^Favorites/)).toBeVisible();

    await page.getByRole('button', { name: /^Language: English/ }).click();
    await page.getByRole('menuitemradio', { name: 'Español' }).click();

    // The navigation landmark's own label is translated too, so look it up by its Spanish name.
    const nav = page.getByRole('navigation', { name: 'Navegación principal' });
    await expect(nav.getByRole('link', { name: /^Favoritos/ })).toBeVisible();
    await expect(html(page)).toHaveAttribute('lang', 'es');

    await page.reload();
    await expect(nav.getByRole('link', { name: /^Favoritos/ })).toBeVisible();
    await expect(html(page)).toHaveAttribute('lang', 'es');
  });
});
