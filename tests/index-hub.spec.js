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

  test('50 percent mastery shows Geschafft only on first-party games', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());

    await page.goto('/bot-labyrinth.html');
    await page.waitForFunction(() => !!window.__ibBotProgress, null, { timeout: 15000 });
    await page.evaluate(() => {
      [0, 1, 2, 3, 4].forEach(index => window.__ibBotProgress.markSolved(index));
    });
    await expect.poll(() => page.evaluate(() => window.__ibBotProgress.read().percent)).toBeGreaterThanOrEqual(50);

    await page.goto('/byte-blaster.html');
    await page.waitForFunction(() => !!window.__ibByteProgress, null, { timeout: 15000 });
    await page.evaluate(() => {
      document.getElementById('sr-streak-display').textContent = '3';
      document.getElementById('drop-combo').textContent = 'x3';
    });
    await expect.poll(() => page.evaluate(() => window.__ibByteProgress.read().percent)).toBeGreaterThanOrEqual(50);

    await page.goto('/');
    const botBadge = page.locator('.game-card[data-game="bot"] [data-mastered-badge]');
    const byteBadge = page.locator('.game-card[data-game="byte"] [data-mastered-badge]');
    await expect(botBadge).toBeVisible();
    await expect(byteBadge).toBeVisible();
    await expect(botBadge).toContainText('Geschafft');
    await expect(byteBadge).toContainText('Geschafft');
    await expect(page.locator('.external-card [data-mastered-badge]')).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });
});