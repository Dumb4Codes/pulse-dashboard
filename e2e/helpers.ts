import { expect, type Locator, type Page } from '@playwright/test';

export const DEMO_EMAIL = 'demo@pulse.dev';
export const DEMO_PASSWORD = 'pulse123';

/** Accessible name of the drag grip on every feed card (`card.drag` in en.json). */
export const DRAG_HANDLE = 'Drag to reorder';

/**
 * Fills the login form with the demo credentials via the "Use demo account" button, which does NOT
 * submit. The button only works once React has hydrated (before that the click is a no-op), so the
 * click is retried until the email field shows the demo address. That makes it double as the
 * "page is interactive" signal the other login tests need before they type.
 */
export async function fillDemoAccount(page: Page): Promise<void> {
  const demo = page.getByRole('button', { name: 'Use demo account' });
  const email = page.getByLabel('Email');
  await expect(async () => {
    await demo.click();
    await expect(email).toHaveValue(DEMO_EMAIL, { timeout: 1_000 });
  }).toPass();
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue(DEMO_PASSWORD);
}

/** Signs in with the demo account through the UI and waits until the feed route (`/`) is shown. */
export async function login(page: Page): Promise<void> {
  await page.goto('/login');
  await fillDemoAccount(page);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await page.waitForURL((url) => url.pathname === '/');
}

/** The feed's cards, in DOM (= reading) order. */
export function feedCards(page: Page): Locator {
  return page.getByRole('list', { name: 'Your feed' }).getByRole('article');
}

/** The feed's card titles (`<h2>`), in DOM order. */
export function feedTitles(page: Page): Locator {
  return feedCards(page).getByRole('heading', { level: 2 });
}

/**
 * `login`, then wait for the first feed card. The feed is fetched and rendered on the client, so a
 * visible card also proves hydration: keyboard shortcuts, drag handlers and buttons are all live.
 */
export async function loginToFeed(page: Page): Promise<void> {
  await login(page);
  await expect(feedCards(page).first()).toBeVisible();
}

/** A link in the main navigation (the sidebar at desktop width; the phone tab bar is display:none there). */
export function navLink(page: Page, name: string | RegExp): Locator {
  return page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name });
}

/** Titles of the first `count` feed cards, once at least that many are rendered. */
export async function topTitles(page: Page, count: number): Promise<string[]> {
  await expect(feedTitles(page).nth(count - 1)).toBeVisible();
  const all = await feedTitles(page).allTextContents();
  return all.slice(0, count).map((title) => title.trim());
}
