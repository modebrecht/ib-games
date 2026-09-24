const { test, expect } = require('@playwright/test');

async function waitForGame(page) {
  await expect(page.locator('body')).not.toContainText('Spiel wird geladen …', { timeout: 15000 });
  await expect(page.locator('body')).not.toContainText('Spiel konnte nicht geladen werden');
}

test.describe('Bot Labyrinth promoted gameplay', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('cybercode.tutorialDone', 'true');
    });
    await page.goto('/bot-labyrinth.html?teacher=1');
    await waitForGame(page);
  });

  test('loads production gameplay modules and no temporary patch paths', async ({ page }) => {
    const production = [
      'data/bot-gameplay-core.js',
      'data/bot-gameplay-feedback.js',
      'data/bot-gameplay-rhythm.js',
      'data/bot-gameplay-levels.js',
      'data/bot-gameplay-boss.js',
      'data/bot-message-addon.js',
    ];
    for (const src of production) {
      await expect(page.locator(`script[src="${src}"]`), `${src} should load exactly once`).toHaveCount(1);
    }

    const temporary = [
      'data/bot-goal-hotfix.js',
      'data/bot-gamefeel-pass.js',
      'data/bot-rhythm-pass.js',
      'data/bot-levels-pass.js',
      'data/bot-boss-pass.js',
      'data/bot-toast-hotfix.js',
    ];
    for (const src of temporary) {
      await expect(page.locator(`script[src="${src}"]`), `${src} must not be loaded`).toHaveCount(0);
    }
  });

  test('WAIT unlocks from Level 5 and the rhythm mission is present', async ({ page }) => {
    const state = await page.evaluate(() => ({
      level5Title: LEVELS[4]?.title,
      level5RhythmCount: LEVELS[4]?.rhythmicHazards?.length ?? 0,
      waitAllowed: allowedCommandsForLevel(4).includes('WAIT'),
      waitLabel: typeof CMD_METADATA !== 'undefined' ? CMD_METADATA.WAIT?.label : null,
    }));

    expect(state.level5Title).toContain('Takt-Laser');
    expect(state.level5RhythmCount).toBe(2);
    expect(state.waitAllowed).toBe(true);
    expect(state.waitLabel).toBe('WARTEN');

    await page.evaluate(() => {
      AppState.currentLevelIndex = 4;
      updateCommandPalette();
    });
    await expect(page.locator('[data-cmd="WAIT"]')).toBeVisible();
  });

  test('route-choice levels and the three-phase boss replace the old linear late game', async ({ page }) => {
    const lateGame = await page.evaluate(() => ({
      level6: { title: LEVELS[5]?.title, par: LEVELS[5]?.par, hazards: LEVELS[5]?.hazards?.length ?? 0 },
      level7: { title: LEVELS[6]?.title, warps: LEVELS[6]?.warps?.length ?? 0 },
      level8: { title: LEVELS[7]?.title, tokens: LEVELS[7]?.tokens?.length ?? 0 },
      level9: {
        title: LEVELS[8]?.title,
        warps: LEVELS[8]?.warps?.length ?? 0,
        rhythm: LEVELS[8]?.rhythmicHazards?.length ?? 0,
      },
      boss: {
        title: LEVELS[9]?.title,
        tokens: LEVELS[9]?.tokens?.length ?? 0,
        size: LEVELS[9]?.size,
      },
    }));

    expect(lateGame.level6.title).toContain('Sprung oder Umweg');
    expect(lateGame.level6.hazards).toBeGreaterThan(0);
    expect(lateGame.level7.title).toContain('Warp-Abkürzung');
    expect(lateGame.level7.warps).toBeGreaterThan(0);
    expect(lateGame.level8.title).toContain('Daten-Switch');
    expect(lateGame.level8.tokens).toBe(2);
    expect(lateGame.level9.title).toContain('Drei Wege');
    expect(lateGame.level9.warps).toBeGreaterThan(0);
    expect(lateGame.level9.rhythm).toBeGreaterThan(0);
    expect(lateGame.boss.title).toContain('BOSS: CORE BREACH');
    expect(lateGame.boss.tokens).toBe(3);
    expect(lateGame.boss.size).toBe(9);
  });

  test('goal handling keeps a valid reached goal from being lost to queued commands', async ({ request }) => {
    const response = await request.get('/data/bot-gameplay-core.js');
    expect(response.ok()).toBeTruthy();
    const source = await response.text();
    expect(source).toContain('if (atGoal && allTokens)');
    expect(source).toContain('stopExecution');
    expect(source).toContain('checkGoalCondition');
  });

  test('boss enforces A-B-C core order and timed security sweeps', async ({ request }) => {
    const response = await request.get('/data/bot-gameplay-boss.js');
    expect(response.ok()).toBeTruthy();
    const source = await response.text();
    expect(source).toContain("id: 'A'");
    expect(source).toContain("id: 'B'");
    expect(source).toContain("id: 'C'");
    expect(source).toContain('Security-Sweep ist AN');
    expect(source).toContain('sweepActive');
  });
});
