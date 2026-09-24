const { test, expect } = require('@playwright/test');

async function waitForGame(page) {
  await expect(page.locator('body')).not.toContainText('Spiel wird geladen …', { timeout: 15000 });
  await expect(page.locator('body')).not.toContainText('Spiel konnte nicht geladen werden');
}

async function failUntilRecovery(page, pattern, path, readySelector, label) {
  let attempts = 0;
  await page.route(pattern, async route => {
    attempts += 1;
    await route.abort('failed');
  });

  await page.goto(path);
  await expect(page.getByRole('heading', { name: 'Spiel konnte nicht geladen werden' })).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole('button', { name: 'Nochmals laden' })).toBeVisible();
  expect(attempts, `${label} should exhaust all automatic retries before showing recovery`).toBe(3);

  await page.unroute(pattern);
  await page.getByRole('button', { name: 'Nochmals laden' }).click();
  await waitForGame(page);
  await expect(page.locator(readySelector), `${label} should fully recover after manual reload`).toBeVisible();
}

test.describe('classroom loader full recovery', () => {
  test.use({ viewport: { width: 390, height: 680 }, isMobile: true, hasTouch: true });

  test('Both games recover after all automatic retries fail and the pupil retries manually', async ({ page }) => {
    await failUntilRecovery(
      page,
      '**/data/bot-labyrinth-3.txt',
      '/bot-labyrinth.html',
      '#game-canvas-shell',
      'Bot Labyrinth'
    );

    await failUntilRecovery(
      page,
      '**/data/byte-blaster-3.txt',
      '/byte-blaster.html',
      '#view-speedrun',
      'Byte Blaster'
    );
  });
});
