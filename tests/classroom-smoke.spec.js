const { test, expect } = require('@playwright/test');

async function waitForGame(page) {
  await expect(page.locator('body')).not.toContainText('Spiel wird geladen …', { timeout: 15000 });
  await expect(page.locator('body')).not.toContainText('Spiel konnte nicht geladen werden');
}

function capturePageErrors(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  return errors;
}

async function finishByteOnboarding(page) {
  const modal = page.locator('#onboardingModal');
  if (!(await modal.count()) || !(await modal.isVisible())) return;

  for (let step = 0; step < 10 && await modal.isVisible(); step += 1) {
    const next = page.locator('.tutorial-next:visible').last();
    await expect(next, `Byte onboarding step ${step + 1} needs a visible continue control`).toBeVisible();
    await next.click();
    await page.waitForTimeout(120);
  }

  await expect(modal, 'Byte onboarding must be completable without leaving the game').toBeHidden();
}

test.describe('7th-grade classroom smoke · phone portrait', () => {
  test.use({ viewport: { width: 390, height: 680 }, isMobile: true, hasTouch: true });

  test('Bot Labyrinth: first interaction, level skip and messages stay non-blocking', async ({ page }) => {
    const pageErrors = capturePageErrors(page);
    await page.goto('/bot-labyrinth.html');
    await waitForGame(page);

    await expect(page.locator('#game-canvas-shell')).toBeVisible();
    await expect(page.locator('#algorithm-panel')).toBeVisible();
    await expect(page.locator('#level-select')).toBeVisible();

    const skip = page.locator('#btn-skip-level');
    await expect(skip).toBeVisible();
    const skipBox = await skip.boundingBox();
    expect(skipBox && skipBox.height).toBeGreaterThanOrEqual(44);

    const command = page.locator('.cmd-add-btn:visible').first();
    await expect(command, 'At least one beginner command must be tappable').toBeVisible();
    const commandBox = await command.boundingBox();
    expect(commandBox && commandBox.height).toBeGreaterThanOrEqual(44);
    await command.click();

    const beforeLevel = await page.locator('#level-select').inputValue();
    await skip.click();
    await expect.poll(() => page.locator('#level-select').inputValue(), {
      message: 'Skip level should visibly advance the selected level'
    }).not.toBe(beforeLevel);

    const toast = page.locator('#toast-alert');
    await page.evaluate(() => showToast('Classroom smoke message', 'info'));
    await expect(toast).toBeVisible();
    await expect(toast).toHaveCSS('pointer-events', 'none');
    await expect(toast).toBeHidden({ timeout: 7500 });

    expect(pageErrors, `Unexpected Bot runtime errors: ${pageErrors.join(' | ')}`).toEqual([]);
  });

  test('Byte Blaster: fresh pupil can finish onboarding and start in 4-bit mode', async ({ page }) => {
    const pageErrors = capturePageErrors(page);
    await page.addInitScript(() => localStorage.clear());
    await page.goto('/byte-blaster.html');
    await waitForGame(page);

    await finishByteOnboarding(page);

    await expect(page.locator('#view-speedrun')).toBeVisible();
    const bits = page.locator('#sr-switches-container .bit-btn:visible');
    await expect(bits, 'Beginner start should expose exactly four bit switches').toHaveCount(4);

    const firstBit = bits.first();
    const bitBox = await firstBit.boundingBox();
    expect(bitBox && bitBox.height).toBeGreaterThanOrEqual(44);
    await firstBit.click();

    const check = page.locator('#sr-btn-check');
    await expect(check).toBeVisible();
    const checkBox = await check.boundingBox();
    expect(checkBox && checkBox.height).toBeGreaterThanOrEqual(44);
    await check.click();

    const activeTab = page.locator('#mode-tabs .mode-tab.bg-cyan-950:visible').first();
    await expect(activeTab, 'The active mode must remain visible after onboarding').toBeVisible();
    const activeBox = await activeTab.boundingBox();
    expect(activeBox && activeBox.x).toBeGreaterThanOrEqual(-1);
    expect(activeBox && activeBox.x + activeBox.width).toBeLessThanOrEqual(391);

    expect(pageErrors, `Unexpected Byte runtime errors: ${pageErrors.join(' | ')}`).toEqual([]);
  });
});

test.describe('7th-grade classroom smoke · phone landscape', () => {
  test.use({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });

  test('Both promoted games remain usable in compact landscape', async ({ page }) => {
    const pageErrors = capturePageErrors(page);

    await page.goto('/bot-labyrinth.html');
    await waitForGame(page);
    await expect(page.locator('#game-canvas-shell')).toBeVisible();
    await expect(page.locator('#action-bar button:visible').first()).toBeVisible();

    await page.addInitScript(() => localStorage.clear());
    await page.goto('/byte-blaster.html');
    await waitForGame(page);

    const onboarding = page.locator('#onboardingModal > div');
    if (await onboarding.count() && await onboarding.isVisible()) {
      const box = await onboarding.boundingBox();
      expect(box && box.height).toBeLessThanOrEqual(390);
      await finishByteOnboarding(page);
    }

    await expect(page.locator('#mode-tabs')).toBeVisible();
    await expect(page.locator('#view-speedrun')).toBeVisible();

    expect(pageErrors, `Unexpected compact-landscape runtime errors: ${pageErrors.join(' | ')}`).toEqual([]);
  });
});
