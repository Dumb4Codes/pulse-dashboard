import { expect, test, type Page } from '@playwright/test';
import { loginToFeed } from './helpers';

/** Counts requests to /api/search, and records the `q` of each. */
function trackSearchRequests(page: Page): string[] {
  const queries: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname === '/api/search') queries.push(url.searchParams.get('q') ?? '');
  });
  return queries;
}

async function openPalette(page: Page) {
  await page.keyboard.press('/');
  const dialog = page.getByRole('dialog', { name: 'Search' });
  await expect(dialog).toBeVisible();
  const input = dialog.getByRole('combobox', { name: 'Search' });
  await expect(input).toBeFocused();
  return { dialog, input };
}

test.describe('search palette', () => {
  test('"/" opens it, typing "ai" slowly makes exactly one request, results are grouped, Escape closes', async ({
    page,
  }) => {
    await loginToFeed(page);
    const queries = trackSearchRequests(page);

    const { dialog, input } = await openPalette(page);
    await expect(dialog.getByText('Type at least 2 characters to search.')).toBeVisible();

    // The response for the final query, awaited before the input is typed so the listener is in place.
    const finalResponse = page.waitForResponse(
      (response) => new URL(response.url()).pathname === '/api/search' && new URL(response.url()).searchParams.get('q') === 'ai',
    );
    await input.pressSequentially('ai', { delay: 120 });
    await finalResponse;

    const results = dialog.getByRole('listbox', { name: 'Search results' });
    await expect(results).toBeVisible();
    await expect(results.getByRole('option').first()).toBeVisible();

    // Group headings (each group is a labelled role=group).
    await expect(results.getByRole('group', { name: 'News' })).toBeVisible();
    await expect(results.getByRole('group', { name: 'Movies' })).toBeVisible();
    await expect(results.getByRole('group', { name: 'Posts' })).toBeVisible();

    // One character ("a") never reaches the server; "ai" does, once.
    expect(queries).toEqual(['ai']);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('button', { name: /Search news, movies, posts/ })).toBeFocused();
  });

  test('debounces: a longer query typed key by key makes no request until 300ms after the last key, then exactly one', async ({
    page,
  }) => {
    await loginToFeed(page);
    const queries = trackSearchRequests(page);

    // Fake clock for the page: debounce timers only advance when the test says so, so this cannot
    // be broken by a slow machine stalling between keystrokes. Time is frozen once the palette is open.
    await page.clock.install();
    const { dialog, input } = await openPalette(page);
    await page.clock.pauseAt(new Date(Date.now() + 5_000));

    // Without debouncing, "model" would be 4 requests (mo, mod, mode, model).
    await input.pressSequentially('model');
    await expect(input).toHaveValue('model');

    await page.clock.runFor(299);
    expect(queries).toEqual([]);

    const finalResponse = page.waitForResponse(
      (response) => new URL(response.url()).pathname === '/api/search' && new URL(response.url()).searchParams.get('q') === 'model',
    );
    await page.clock.runFor(1); // 300ms since the last keystroke
    await finalResponse;
    await page.clock.resume();

    await expect(dialog.getByRole('listbox', { name: 'Search results' })).toBeVisible();
    expect(queries).toEqual(['model']);
  });

  test('a query with no matches shows the empty message; whitespace never searches', async ({ page }) => {
    await loginToFeed(page);
    const queries = trackSearchRequests(page);

    const { dialog, input } = await openPalette(page);

    await input.pressSequentially('   ', { delay: 20 });
    await expect(dialog.getByText('Type at least 2 characters to search.')).toBeVisible();

    await input.fill('zzzzqqqq');
    await expect(dialog.getByText('No results for “zzzzqqqq”')).toBeVisible();
    expect(queries).toEqual(['zzzzqqqq']);
  });
});
