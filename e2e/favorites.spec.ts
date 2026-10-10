import { expect, test } from '@playwright/test';
import { feedCards, feedTitles, loginToFeed, navLink } from './helpers';

test.describe('favorites', () => {
  test('hearting a card saves it to Favorites, survives a reload, and un-hearting empties the page', async ({
    page,
  }) => {
    await loginToFeed(page);
    const title = (await feedTitles(page).first().textContent())?.trim() ?? '';
    expect(title).not.toBe('');

    // Heart the first card.
    const card = feedCards(page).first();
    const heart = card.getByRole('button', { name: 'Add to favorites' });
    await expect(heart).toHaveAttribute('aria-pressed', 'false');
    await heart.click();
    await expect(card.getByRole('button', { name: 'Remove from favorites' })).toHaveAttribute('aria-pressed', 'true');

    // The sidebar badge counts it, and the link opens Favorites.
    await expect(navLink(page, /^Favorites\s*1$/)).toBeVisible();
    await navLink(page, /^Favorites/).click();
    await expect(page).toHaveURL(/\/favorites$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Favorites' })).toBeVisible();

    const saved = page.getByRole('article').filter({ has: page.getByRole('heading', { level: 2, name: title, exact: true }) });
    await expect(saved).toHaveCount(1);
    await expect(page.getByText('1 saved item')).toBeVisible();

    // Persisted in localStorage: still there after a full reload.
    await page.reload();
    await expect(saved).toHaveCount(1);
    await expect(page.getByText('1 saved item')).toBeVisible();

    // Un-favorite from this page -> the empty state.
    await saved.getByRole('button', { name: 'Remove from favorites' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'No favorites yet' })).toBeVisible();
    await expect(page.getByRole('article')).toHaveCount(0);

    // ...and it stays empty after a reload.
    await page.reload();
    await expect(page.getByRole('heading', { level: 2, name: 'No favorites yet' })).toBeVisible();
  });

  test('a favorite remains in the feed as a pressed heart after navigating back', async ({ page }) => {
    await loginToFeed(page);
    const title = (await feedTitles(page).first().textContent())?.trim() ?? '';

    await feedCards(page).first().getByRole('button', { name: 'Add to favorites' }).click();
    await navLink(page, /^Favorites/).click();
    await expect(page).toHaveURL(/\/favorites$/);
    await navLink(page, 'Feed').click();
    await expect(page).toHaveURL((url) => url.pathname === '/');

    const card = feedCards(page).filter({ has: page.getByRole('heading', { level: 2, name: title, exact: true }) });
    await expect(card.getByRole('button', { name: 'Remove from favorites' })).toHaveAttribute('aria-pressed', 'true');
  });
});
