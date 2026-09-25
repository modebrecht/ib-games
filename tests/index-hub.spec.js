const { test, expect } = require('@playwright/test');

async function expectNoHorizontalOverflow(page) {
  await expect.poll(() => page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }))).toEqual(expect.objectContaining({ viewportWidth: expect.any(Number) }));

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, 'Index must not create horizontal scrolling').toBeLessThanOrEqual(1);
}

test.describe('IB Games hub', () => {
  test('desktop keeps first-party games primary and keyboard accessible', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1, name: 'Lernen durch Spielen.' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Bot-Labyrinth/ })).toHaveAttribute('href', 'bot-labyrinth.html');
    await expect(page.getByRole('link', { name: /Byte Blaster/ })).toHaveAttribute('href', 'byte-blaster.html');
    await expect(page.getByRole('heading', { level: 2, name: 'Weitere Lernangebote' })).toBeVisible();

    const cards = page.locator('.game-card');
    await expect(cards).toHaveCount(2);
    const first = await cards.nth(0).boundingBox();
    const second = await cards.nth(1).boundingBox();
    expect(first && second && Math.abs(first.y - second.y)).toBeLessThan(3);

    await page.keyboard.press('Tab');
    await expect(page.locator('a.game-card').first()).toBeFocused();
    await expectNoHorizontalOverflow(page);
  });

  test('phone portrait stacks cards without clipping', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 680 });
    await page.goto('/');

    await expect(page.locator('.games')).toHaveCSS('grid-template-columns', /.+/);
    const cards = page.locator('.game-card');
    const first = await cards.nth(0).boundingBox();
    const second = await cards.nth(1).boundingBox();
    expect(first && second && second.y).toBeGreaterThan((first && first.y) || 0);
    expect(first && first.width).toBeLessThanOrEqual(390);
    expect(second && second.width).toBeLessThanOrEqual(390);

    await expect(page.getByRole('link', { name: /Quick, Draw!/ })).toHaveAttribute('target', '_blank');
    await expect(page.getByRole('link', { name: /Google AI Quests/ })).toHaveAttribute('target', '_blank');
    await expectNoHorizontalOverflow(page);
  });
});
