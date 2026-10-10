import { expect, test, type Page } from '@playwright/test';
import { feedCards, loginToFeed, navLink } from './helpers';

/** Feed cards whose category badge reads exactly `label` (the badge is the only element with that exact text). */
function cardsInCategory(page: Page, label: string) {
  return feedCards(page).filter({ has: page.getByText(label, { exact: true }) });
}

function categoryChip(page: Page, label: string) {
  return page.getByRole('group', { name: 'Categories' }).getByRole('button', { name: label, exact: true });
}

test.describe('settings', () => {
  test('deselecting a category removes its cards from the feed, and it stays removed after a reload', async ({
    page,
  }) => {
    await loginToFeed(page);

    // Defaults are Technology, Sports and Finance, all present in the first screenful of the feed.
    await expect(cardsInCategory(page, 'Sports').first()).toBeVisible();
    await expect(cardsInCategory(page, 'Technology').first()).toBeVisible();

    await navLink(page, 'Settings').click();
    await expect(page).toHaveURL(/\/settings$/);
    const sports = categoryChip(page, 'Sports');
    await expect(sports).toHaveAttribute('aria-pressed', 'true');
    await sports.click();
    await expect(sports).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible();

    await navLink(page, 'Feed').click();
    await expect(page).toHaveURL((url) => url.pathname === '/');

    // The new selection is a new query: wait for its cards, then assert none are Sports.
    await expect(cardsInCategory(page, 'Technology').first()).toBeVisible();
    await expect(cardsInCategory(page, 'Finance').first()).toBeVisible();
    await expect(cardsInCategory(page, 'Sports')).toHaveCount(0);

    await page.reload();
    await expect(cardsInCategory(page, 'Technology').first()).toBeVisible();
    await expect(cardsInCategory(page, 'Sports')).toHaveCount(0);

    // Re-selecting brings the category back.
    await navLink(page, 'Settings').click();
    await categoryChip(page, 'Sports').click();
    await expect(categoryChip(page, 'Sports')).toHaveAttribute('aria-pressed', 'true');
    await navLink(page, 'Feed').click();
    await expect(cardsInCategory(page, 'Sports').first()).toBeVisible();
  });

  test('the last remaining category cannot be deselected', async ({ page }) => {
    await loginToFeed(page);
    await navLink(page, 'Settings').click();
    await expect(page).toHaveURL(/\/settings$/);

    await categoryChip(page, 'Sports').click();
    await categoryChip(page, 'Finance').click();
    const technology = categoryChip(page, 'Technology');
    await expect(technology).toHaveAttribute('aria-pressed', 'true');
    await expect(technology).toHaveAttribute('aria-disabled', 'true');

    // aria-disabled (not `disabled`): the chip stays focusable so the explanation is reachable, hence force.
    await technology.click({ force: true });
    await expect(technology).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('Keep at least one category selected.')).toBeVisible();

    // The feed still has content: it never ends up with zero categories.
    await navLink(page, 'Feed').click();
    await expect(cardsInCategory(page, 'Technology').first()).toBeVisible();
  });
});
