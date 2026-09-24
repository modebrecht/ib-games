const { test, expect } = require('@playwright/test');

async function waitForGame(page) {
  await expect(page.locator('body')).not.toContainText('Spiel wird geladen …', { timeout: 15000 });
  await expect(page.locator('body')).not.toContainText('Spiel konnte nicht geladen werden');
}

function capturePageErrors(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.stack || error.message));
  return errors;
}

async function releaseByteTutorial(page) {
  const modal = page.locator('#onboardingModal');
  if (!(await modal.count())) return;

  // Byte onboarding is staged: a card can close and the next card can open
  // shortly afterwards. Only return once the modal stays closed long enough
  // for the pupil's next interaction to be genuinely available.
  for (let step = 0; step < 12; step += 1) {
    await page.waitForTimeout(180);
    if (!(await modal.isVisible())) {
      await page.waitForTimeout(180);
      if (!(await modal.isVisible())) return;
      continue;
    }

    const next = page.locator('.tutorial-next:visible').last();
    await expect(next, `Byte onboarding step ${step + 1} needs a visible continue control`).toBeVisible();
    await next.click();
  }

  await expect(modal, 'Byte onboarding must release the gameplay controls').toBeHidden();
}

async function releaseBotTutorialStep(page) {
  const modal = page.locator('#modal-tutorial');
  if (!(await modal.count())) return;

  // Bot onboarding is also staged. A card can disappear and another tutorial
  // card can be scheduled immediately afterwards, so a single "hidden" check
  // is not enough. Only return after controls stay unobstructed briefly.
  for (let step = 0; step < 8; step += 1) {
    if (!(await modal.isVisible())) {
      await page.waitForTimeout(220);
      if (!(await modal.isVisible())) return;
      continue;
    }

    const skip = modal.getByRole('button', { name: 'Überspringen', exact: true });
    if (await skip.count() && await skip.isVisible()) {
      await skip.click();
    } else {
      const advance = modal.getByRole('button').filter({ hasText: /Weiter|Fertig|Los geht|Start/i }).first();
      await expect(advance, `Bot tutorial step ${step + 1} needs a visible continue control`).toBeVisible();
      await advance.click();
    }

    await expect(modal, 'Bot tutorial card must release controls for the guided action').toBeHidden();
    await page.waitForTimeout(220);
  }

  await expect(modal, 'Bot tutorial must leave the next pupil control unobstructed').toBeHidden();
}

test.describe('7th-grade classroom smoke · phone portrait', () => {
  test.use({ viewport: { width: 390, height: 680 }, isMobile: true, hasTouch: true });

  test('Bot Labyrinth: guided onboarding, first run and messages stay non-blocking', async ({ page }) => {
    const pageErrors = capturePageErrors(page);
    await page.goto('/bot-labyrinth.html');
    await waitForGame(page);

    await expect.poll(() => page.evaluate(() => window.__IB_BOT_MESSAGE_ADDON_VERSION)).toBe('1.0.1');
    await expect(page.locator('script[src="data/bot-message-addon.js"]')).toHaveCount(1);
    await expect(page.locator('script[src="data/bot-toast-hotfix.js"]'), 'Legacy Bot monkeypatch must not be loaded').toHaveCount(0);

    await expect(page.locator('#game-canvas-shell')).toBeVisible();
    await expect(page.locator('#algorithm-panel')).toBeVisible();
    await expect(page.locator('#level-select')).toBeVisible();
    await expect(page.locator('#btn-skip-level'), 'Debug hint rewrites must preserve the level-skip control').toHaveCount(1);

    const missionText = page.locator('#mission-text');
    await expect(missionText, 'Mission text must remain readable on compact portrait screens').toBeVisible();
    const missionFontSize = await missionText.evaluate(el => parseFloat(getComputedStyle(el).fontSize));
    expect(missionFontSize, 'Mission text must not shrink below 12px').toBeGreaterThanOrEqual(12);

    const missionLabel = page.locator('#mission-card > div').first();
    await expect(missionLabel, 'Mission label/supporting copy should exist').toBeVisible();
    const missionLabelFontSize = await missionLabel.evaluate(el => parseFloat(getComputedStyle(el).fontSize));
    expect(missionLabelFontSize, 'Mission supporting text must not shrink below 11px').toBeGreaterThanOrEqual(11);

    // Bot onboarding is contextual: each card releases the pupil to perform
    // the requested action, then the next card appears after that action.
    await releaseBotTutorialStep(page);

    const command = page.locator('.cmd-add-btn:visible').first();
    await expect(command, 'At least one beginner command must be tappable').toBeVisible();
    const commandBox = await command.boundingBox();
    expect(commandBox && commandBox.height).toBeGreaterThanOrEqual(44);
    await command.click({ timeout: 5000 });

    await page.waitForTimeout(180);
    await releaseBotTutorialStep(page);

    const start = page.getByRole('button', { name: 'Algorithmus starten oder pausieren' });
    await expect(start).toBeVisible();
    const startBox = await start.boundingBox();
    expect(startBox && startBox.height).toBeGreaterThanOrEqual(44);
    await start.click({ timeout: 5000 });
    await page.waitForTimeout(350);

    await releaseBotTutorialStep(page);

    const reset = page.getByRole('button', { name: 'Roboter zurücksetzen' });
    await expect(reset).toBeVisible();
    await reset.click({ timeout: 5000 });

    const toast = page.locator('#toast-alert');
    await page.evaluate(() => showToast('Classroom smoke message', 'info'));
    await expect(toast).toBeVisible();
    await expect(toast).toHaveCSS('pointer-events', 'none');
    await expect(toast).toBeHidden({ timeout: 7500 });

    expect(pageErrors, `Unexpected Bot runtime errors:\n${pageErrors.join('\n---\n')}`).toEqual([]);
  });

  test('Byte Blaster: fresh pupil can finish onboarding and start in 4-bit mode', async ({ page }) => {
    const pageErrors = capturePageErrors(page);
    await page.addInitScript(() => localStorage.clear());
    await page.goto('/byte-blaster.html');
    await waitForGame(page);

    await releaseByteTutorial(page);

    await expect(page.locator('#view-speedrun')).toBeVisible();
    const bits = page.locator('#sr-switches-container .bit-btn:visible');
    await expect(bits, 'Beginner start should expose exactly four bit switches').toHaveCount(4);

    const firstBit = bits.first();
    const bitBox = await firstBit.boundingBox();
    expect(bitBox && bitBox.height).toBeGreaterThanOrEqual(44);
    await releaseByteTutorial(page);
    await firstBit.click({ timeout: 5000 });

    await releaseByteTutorial(page);
    const check = page.locator('#sr-btn-check');
    await expect(check).toBeVisible();
    const checkBox = await check.boundingBox();
    expect(checkBox && checkBox.height).toBeGreaterThanOrEqual(44);
    await check.click({ timeout: 5000 });
    await releaseByteTutorial(page);

    const activeTab = page.locator('#mode-tabs .mode-tab.bg-cyan-950:visible').first();
    await expect(activeTab, 'The active mode must remain visible after onboarding').toBeVisible();
    const activeBox = await activeTab.boundingBox();
    expect(activeBox && activeBox.x).toBeGreaterThanOrEqual(-1);
    expect(activeBox && activeBox.x + activeBox.width).toBeLessThanOrEqual(391);

    expect(pageErrors, `Unexpected Byte runtime errors:\n${pageErrors.join('\n---\n')}`).toEqual([]);
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
    await expect(page.locator('#btn-skip-level')).toHaveCount(1);

    await page.addInitScript(() => localStorage.clear());
    await page.goto('/byte-blaster.html');
    await waitForGame(page);

    const onboarding = page.locator('#onboardingModal > div');
    if (await onboarding.count() && await onboarding.isVisible()) {
      const box = await onboarding.boundingBox();
      expect(box && box.height).toBeLessThanOrEqual(390);
    }
    await releaseByteTutorial(page);

    await expect(page.locator('#mode-tabs')).toBeVisible();
    await expect(page.locator('#view-speedrun')).toBeVisible();

    expect(pageErrors, `Unexpected compact-landscape runtime errors:\n${pageErrors.join('\n---\n')}`).toEqual([]);
  });
});

test.describe('classroom loader resilience', () => {
  test.use({ viewport: { width: 390, height: 680 }, isMobile: true, hasTouch: true });

  test('Both games recover when the first chunk request fails once', async ({ page }) => {
    let botAttempts = 0;
    await page.route('**/data/bot-labyrinth-3.txt', async route => {
      botAttempts += 1;
      if (botAttempts === 1) {
        await route.abort('failed');
        return;
      }
      await route.continue();
    });

    await page.goto('/bot-labyrinth.html');
    await waitForGame(page);
    await expect(page.locator('#game-canvas-shell')).toBeVisible();
    expect(botAttempts, 'Bot loader should retry a failed chunk').toBeGreaterThanOrEqual(2);
    await page.unroute('**/data/bot-labyrinth-3.txt');

    let byteAttempts = 0;
    await page.route('**/data/byte-blaster-3.txt', async route => {
      byteAttempts += 1;
      if (byteAttempts === 1) {
        await route.abort('failed');
        return;
      }
      await route.continue();
    });

    await page.goto('/byte-blaster.html');
    await waitForGame(page);
    await expect(page.locator('#view-speedrun')).toBeVisible();
    expect(byteAttempts, 'Byte loader should retry a failed chunk').toBeGreaterThanOrEqual(2);
  });
});
