import { expect, test } from '@playwright/test';
import { feedCards, feedTitles, loginToFeed } from './helpers';

const DETAILS = /\/content\/[^/]+$/;

test.describe('details page', () => {
  test('clicking anywhere on a card opens its details; reload and Back both work', async ({ page }) => {
    await loginToFeed(page);
    const title = (await feedTitles(page).first().textContent())?.trim() ?? '';
    const card = feedCards(page).first();

    // Click the photograph, not the headline: the whole card is the target.
    const box = (await card.boundingBox())!;
    await page.mouse.click(box.x + 30, box.y + box.height / 2);
    await expect(page).toHaveURL(DETAILS);
    await expect(page.getByRole('heading', { level: 1, name: title, exact: true })).toBeVisible();
    await expect(page.getByRole('complementary', { name: 'At a glance' })).toBeVisible();
    await expect(page.getByRole('meter', { name: 'Trending score' })).toBeVisible();

    // A reload keeps the page (the item was saved when it was opened).
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: title, exact: true })).toBeVisible();

    // Back returns to the feed.
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(feedCards(page).first()).toBeVisible();
    await expect(page).toHaveURL((url) => url.pathname === '/');
  });

  test('the heart on the card and the heart on the details page are the same favorite', async ({ page }) => {
    await loginToFeed(page);
    const card = feedCards(page).first();
    await card.getByRole('button', { name: 'Add to favorites' }).click();

    await card.getByRole('heading', { level: 2 }).getByRole('link').click();
    await expect(page).toHaveURL(DETAILS);
    const article = page.getByRole('article').first();
    await expect(article.getByRole('button', { name: 'Remove from favorites' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('a related card opens another details page', async ({ page }) => {
    await loginToFeed(page);
    await feedCards(page).first().getByRole('heading', { level: 2 }).getByRole('link').click();
    const first = page.url();

    const related = page.getByRole('region', { name: /^More in / });
    const next = related.getByRole('article').first();
    const nextTitle = (await next.getByRole('heading', { level: 2 }).textContent())?.trim() ?? '';
    await next.getByRole('heading', { level: 2 }).getByRole('link').click();
    await expect(page.getByRole('heading', { level: 1, name: nextTitle, exact: true })).toBeVisible();
    expect(page.url()).not.toBe(first);
  });

  test('a search result opens its details page', async ({ page }) => {
    await loginToFeed(page);
    await page.keyboard.press('/');
    await page.getByRole('combobox').fill('open');
    await expect(page.getByRole('option').first()).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(DETAILS);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('a Trending tile opens its details page', async ({ page }) => {
    await loginToFeed(page);
    await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: /^Trending/ }).click();
    await expect(page).toHaveURL(/\/trending$/);
    await page.getByRole('article').first().getByRole('link').first().click();
    await expect(page).toHaveURL(DETAILS);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('a link opened in a fresh tab (no saved state) still works for catalogue items, and unknown ids say so', async ({ page }) => {
    await loginToFeed(page);
    await page.evaluate(() => localStorage.clear());
    await page.goto('/content/news-technology-0-0');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await page.goto('/content/this-id-does-not-exist');
    await expect(page.getByRole('heading', { level: 2, name: "We couldn't find that item" })).toBeVisible();
    await page.getByRole('link', { name: 'Back to your feed' }).click();
    await expect(page).toHaveURL((url) => url.pathname === '/');
  });
});
