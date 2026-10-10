import { expect, test } from '@playwright/test';
import { DRAG_HANDLE, feedCards, feedTitles, loginToFeed, topTitles } from './helpers';

// Tall enough that the first two cards (and the drop target below the second) are on screen at once.
test.use({ viewport: { width: 1280, height: 1000 } });

async function expectTopOrder(page: Parameters<typeof feedTitles>[0], expected: string[]) {
  for (const [index, title] of expected.entries()) {
    await expect(feedTitles(page).nth(index)).toHaveText(title);
  }
}

test.describe('feed reordering', () => {
  test('dragging the first card below the second with the mouse swaps them, and the order survives a reload', async ({
    page,
  }) => {
    await loginToFeed(page);
    const [first, second, third] = await topTitles(page, 3);

    const handle = feedCards(page).nth(0).getByRole('button', { name: DRAG_HANDLE });
    const target = feedCards(page).nth(1).getByRole('button', { name: DRAG_HANDLE });

    // hover() waits for the card to stop moving (entrance animation) and parks the mouse on the grip.
    await handle.hover();
    const from = await handle.boundingBox();
    const to = await target.boundingBox();
    expect(from).not.toBeNull();
    expect(to).not.toBeNull();

    const startX = from!.x + from!.width / 2;
    const startY = from!.y + from!.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    // Past the centre of the second card, but well short of the third.
    await page.mouse.move(to!.x + to!.width / 2, to!.y + to!.height / 2 + 40, { steps: 20 });
    await page.mouse.up();

    await expectTopOrder(page, [second, first, third]);

    await page.reload();
    await expect(feedCards(page).first()).toBeVisible();
    await expectTopOrder(page, [second, first, third]);
  });

  test('keyboard: ArrowDown on a focused grip moves its card down one place, announces it, and persists', async ({
    page,
  }) => {
    await loginToFeed(page);
    const [first, second, third] = await topTitles(page, 3);

    const handle = feedCards(page).nth(0).getByRole('button', { name: DRAG_HANDLE });
    await handle.focus();
    await expect(handle).toBeFocused();
    const handleId = await handle.getAttribute('data-handle-id');
    expect(handleId).toBeTruthy();

    await page.keyboard.press('ArrowDown');

    await expectTopOrder(page, [second, first, third]);
    // The polite live region says what happened (not the visual position, so it works for screen readers).
    await expect(page.locator('[data-feed-announcer]')).toHaveText(new RegExp(`^Moved .+ to position 2 of \\d+$`));
    // Focus stays on the grip of the card that moved.
    await expect(page.locator(`[data-handle-id="${handleId}"]`)).toBeFocused();

    // ArrowUp puts it back; then ArrowDown once more and reload to prove persistence of the final order.
    await page.keyboard.press('ArrowUp');
    await expectTopOrder(page, [first, second, third]);
    await page.keyboard.press('ArrowDown');
    await expectTopOrder(page, [second, first, third]);

    await page.reload();
    await expect(feedCards(page).first()).toBeVisible();
    await expectTopOrder(page, [second, first, third]);
  });

  test('keyboard: the first card cannot move up, and says so', async ({ page }) => {
    await loginToFeed(page);
    const [first, second] = await topTitles(page, 2);

    const handle = feedCards(page).nth(0).getByRole('button', { name: DRAG_HANDLE });
    await handle.focus();
    await page.keyboard.press('ArrowUp');

    await expect(page.locator('[data-feed-announcer]')).toHaveText(`${first} is already first`);
    await expectTopOrder(page, [first, second]);
  });
});
