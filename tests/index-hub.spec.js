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
  test('desktop presents all four offers as equal game cards and opens playable links in new tabs', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1, name: 'Lernen durch Spielen.' })).toBeVisible();

    const bot = page.getByRole('link', { name: /Bot-Labyrinth/ });
    const byte = page.getByRole('link', { name: /Byte Blaster/ });
    await expect(bot).toHaveAttribute('href', 'bot-labyrinth.html');
    await expect(byte).toHaveAttribute('href', 'byte-blaster.html');
    await expect(bot).toHaveAttribute('target', '_blank');
    await expect(byte).toHaveAttribute('target', '_blank');
    await expect(bot).toHaveAttribute('rel', /noopener/);
    await expect(byte).toHaveAttribute('rel', /noopener/);
    await expect(page.getByRole('heading', { level: 2, name: 'Weitere Lernangebote' })).toBeVisible();

    const cards = page.locator('.game-card');
    await expect(cards).toHaveCount(4);
    await expect(page.locator('.external-card')).toHaveCount(2);
    await expect(page.locator('.external-card.game-card')).toHaveCount(2);

    const first = await cards.nth(0).boundingBox();
    const second = await cards.nth(1).boundingBox();
    const third = await cards.nth(2).boundingBox();
    const fourth = await cards.nth(3).boundingBox();
    expect(first && second && Math.abs(first.y - second.y)).toBeLessThan(3);
    expect(third && fourth && Math.abs(third.y - fourth.y)).toBeLessThan(3);
    expect(first && third && Math.abs(first.width - third.width)).toBeLessThan(3);

    await page.keyboard.press('Tab');
    await expect(page.locator('a.game-card').first()).toBeFocused();
    await expectNoHorizontalOverflow(page);
  });

  test('discovery offers start locked and phone layout does not clip', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 680 });
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await expect(page.locator('.games')).toHaveCSS('grid-template-columns', /.+/);
    const cards = page.locator('.game-card');
    await expect(cards).toHaveCount(4);

    for (let index = 0; index < 4; index += 1) {
      const box = await cards.nth(index).boundingBox();
      expect(box && box.width).toBeLessThanOrEqual(390);
      if (index > 0) {
        const previous = await cards.nth(index - 1).boundingBox();
        expect(box && previous && box.y).toBeGreaterThan(previous.y);
      }
    }

    const discoveryCards = page.locator('.external-card');
    await expect(discoveryCards).toHaveCount(2);
    await expect(discoveryCards.nth(0)).toHaveClass(/game-card/);
    await expect(discoveryCards.nth(1)).toHaveClass(/game-card/);
    await expect(discoveryCards.nth(0)).toHaveClass(/is-locked/);
    await expect(discoveryCards.nth(1)).toHaveClass(/is-locked/);
    await expect(discoveryCards.nth(0)).toHaveAttribute('aria-disabled', 'true');
    await expect(discoveryCards.nth(1)).toHaveAttribute('aria-disabled', 'true');
    await expect(discoveryCards.nth(0)).not.toHaveAttribute('href', /.+/);
    await expect(discoveryCards.nth(1)).not.toHaveAttribute('href', /.+/);
    await expect(page.getByText('50 % zuerst erreichen')).toHaveCount(2);
    await expectNoHorizontalOverflow(page);
  });

  test('Bot reaching 50 percent permanently unlocks both discovery offers', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());

    await page.goto('/bot-labyrinth.html');
    await page.waitForFunction(() => !!window.__ibBotProgress, null, { timeout: 15000 });
    await page.evaluate(() => {
      [0, 1, 2, 3, 4].forEach(index => window.__ibBotProgress.markSolved(index));
    });
    await expect.poll(() => page.evaluate(() => window.__ibBotProgress.read().percent)).toBeGreaterThanOrEqual(50);
    await expect.poll(() => page.evaluate(() => localStorage.getItem('ib-games:unlock:more:v1'))).toBe('1');

    await page.goto('/');
    const botBadge = page.locator('.game-card[data-game="bot"] [data-mastered-badge]');
    await expect(botBadge).toBeVisible();
    await expect(botBadge).toContainText('Geschafft');

    const discoveryCards = page.locator('.external-card');
    await expect(discoveryCards.nth(0)).not.toHaveClass(/is-locked/);
    await expect(discoveryCards.nth(1)).not.toHaveClass(/is-locked/);
    await expect(discoveryCards.nth(0)).toHaveAttribute('href', 'https://quickdraw.withgoogle.com/');
    await expect(discoveryCards.nth(1)).toHaveAttribute('href', 'https://research.google/ai-quests/intl/en_us');
    await expect(discoveryCards.nth(0)).toHaveAttribute('target', '_blank');
    await expect(discoveryCards.nth(1)).toHaveAttribute('target', '_blank');
    await expect(discoveryCards.nth(0)).toHaveAttribute('rel', /noopener/);
    await expect(discoveryCards.nth(1)).toHaveAttribute('rel', /noopener/);
    await expect(page.locator('.external-lock:visible')).toHaveCount(0);

    await page.evaluate(() => {
      localStorage.removeItem('ib-games:progress:bot:v1');
      localStorage.removeItem('ib-games:progress:byte:v1');
    });
    await page.reload();

    await expect(page.locator('.external-card.is-locked')).toHaveCount(0);
    await expect(discoveryCards.nth(0)).toHaveAttribute('href', 'https://quickdraw.withgoogle.com/');
    await expect(discoveryCards.nth(1)).toHaveAttribute('href', 'https://research.google/ai-quests/intl/en_us');
    await expectNoHorizontalOverflow(page);
  });

  test('Byte reaching 50 percent also unlocks discovery', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());

    await page.goto('/byte-blaster.html');
    await page.waitForFunction(() => !!window.__ibByteProgress, null, { timeout: 15000 });
    await page.evaluate(() => {
      window.__ibByteProgress.mark('speedrun');
      window.__ibByteProgress.mark('drop');
    });
    await expect.poll(() => page.evaluate(() => window.__ibByteProgress.read().percent)).toBeGreaterThanOrEqual(50);
    await expect.poll(() => page.evaluate(() => localStorage.getItem('ib-games:unlock:more:v1'))).toBe('1');

    await page.goto('/');
    const byteBadge = page.locator('.game-card[data-game="byte"] [data-mastered-badge]');
    await expect(byteBadge).toBeVisible();
    await expect(byteBadge).toContainText('Geschafft');
    await expect(page.locator('.external-card.is-locked')).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });
});
