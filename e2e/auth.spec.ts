import { expect, test } from '@playwright/test';
import { feedCards, fillDemoAccount, login, loginToFeed } from './helpers';

test.describe('auth', () => {
  test('an unauthenticated visit to / redirects to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  });

  test('other protected pages redirect to /login too', async ({ page }) => {
    for (const path of ['/favorites', '/settings', '/trending']) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login$/);
    }
  });

  test('a wrong password shows an alert and stays on /login', async ({ page }) => {
    await page.goto('/login');
    await fillDemoAccount(page); // proves the page has hydrated before we type
    await page.getByLabel('Password', { exact: true }).fill('not-the-password');
    await page.getByRole('button', { name: 'Log in', exact: true }).click();

    // Next's route announcer is also role=alert, so pick ours by its text.
    await expect(page.getByRole('alert').filter({ hasText: 'do not match' })).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('the demo account lands on the feed', async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Your feed' })).toBeVisible();
    await expect(feedCards(page).first()).toBeVisible();
  });

  test('a signed-in visit to /login bounces back to the feed', async ({ page }) => {
    await login(page);
    await page.goto('/login');
    await expect(page).toHaveURL((url) => url.pathname === '/');
  });

  test('signing out returns to /login and locks the app again', async ({ page }) => {
    await loginToFeed(page);

    await page.getByRole('button', { name: 'Account menu' }).click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();

    // The session cookie is gone: the feed is no longer reachable.
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
  });
});
