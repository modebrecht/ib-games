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
    expect(source).toContain('goalIsComplete');
    expect(source).toContain('stopExecution');
    expect(source).toContain('checkGoalCondition');
  });

  test('reaching the goal ends immediately even when the base step returns undefined', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const source = await fetch('/data/bot-gameplay-core.js').then(response => response.text());
      const frame = document.createElement('iframe');
      document.body.appendChild(frame);
      const w = frame.contentWindow;

      w.AppState = {
        bot: { x: 0, y: 0 },
        goalPos: { x: 1, y: 0 },
        tokensCollected: new Set(),
        tokensTotal: 0,
        status: 'RUNNING',
      };
      w.stepCalls = 0;
      w.goalChecks = 0;
      w.stopCalls = 0;

      w.executeNextStep = function() {
        w.stepCalls += 1;
        if (w.stepCalls === 1) {
          w.AppState.bot.x = 1;
          setTimeout(() => w.executeNextStep(), 0);
        } else {
          w.AppState.bot.x = 2;
        }
        return undefined;
      };

      w.checkGoalCondition = function() {
        w.goalChecks += 1;
        if (w.AppState.bot.x === w.AppState.goalPos.x && w.AppState.bot.y === w.AppState.goalPos.y) {
          w.AppState.status = 'WON';
        }
      };

      w.stopExecution = function() {
        w.stopCalls += 1;
      };

      w.eval(source);
      w.executeNextStep();
      await new Promise(resolve => setTimeout(resolve, 30));

      const snapshot = {
        status: w.AppState.status,
        x: w.AppState.bot.x,
        stepCalls: w.stepCalls,
        goalChecks: w.goalChecks,
        stopCalls: w.stopCalls,
      };
      frame.remove();
      return snapshot;
    });

    expect(result.status).toBe('WON');
    expect(result.x).toBe(1);
    expect(result.stepCalls).toBe(1);
    expect(result.goalChecks).toBe(1);
    expect(result.stopCalls).toBe(1);
  });

  test('NOCHMAL resets through the native reset control before rerunning', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const source = await fetch('/data/bot-gameplay-feedback.js').then(response => response.text());
      const frame = document.createElement('iframe');
      document.body.appendChild(frame);
      const doc = frame.contentDocument;
      const w = frame.contentWindow;

      doc.body.innerHTML = `
        <div id="game-canvas-shell"></div>
        <button id="btn-play"><span id="btn-play-label">START</span></button>
        <button id="btn-reset">RESET</button>
      `;

      w.AppState = {
        speedMs: 230,
        commands: [{ type: 'FORWARD' }],
        startPos: { x: 0, y: 0, dir: 1 },
        bot: { x: 1, y: 0, dir: 1 },
        stepIndex: 4,
        tokensCollected: new Set(),
        status: 'CRASHED',
        executing: false,
      };
      w.startCalls = 0;
      w.resetClicks = 0;
      w.stepSeenByStart = null;
      w.startExecution = function() {
        w.startCalls += 1;
        w.stepSeenByStart = w.AppState.stepIndex;
      };
      w.handleCrash = function() {};
      w.checkGoalCondition = function() {};
      w.executeScan = function() {};
      w.activateWarpIfPresent = function() { return false; };

      doc.getElementById('btn-reset').addEventListener('click', () => {
        w.resetClicks += 1;
        w.AppState.bot = { ...w.AppState.startPos };
        w.AppState.stepIndex = -1;
        w.AppState.status = 'IDLE';
      });

      w.eval(source);
      w.handleCrash('test');
      const retryLabel = doc.getElementById('btn-play-label').textContent;
      w.startExecution();

      const snapshot = {
        retryLabel,
        resetClicks: w.resetClicks,
        startCalls: w.startCalls,
        stepSeenByStart: w.stepSeenByStart,
      };
      frame.remove();
      return snapshot;
    });

    expect(result.retryLabel).toBe('NOCHMAL');
    expect(result.resetClicks).toBe(1);
    expect(result.startCalls).toBe(1);
    expect(result.stepSeenByStart).toBe(-1);
  });

  test('full run restarts at command 1 after a partial step instead of skipping the first command', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const source = await fetch('/data/bot-gameplay-feedback.js').then(response => response.text());
      const frame = document.createElement('iframe');
      document.body.appendChild(frame);
      const doc = frame.contentDocument;
      const w = frame.contentWindow;

      doc.body.innerHTML = `
        <div id="game-canvas-shell"></div>
        <button id="btn-play"><span id="btn-play-label">START</span></button>
        <button id="btn-reset">RESET</button>
      `;

      w.AppState = {
        speedMs: 230,
        commands: [{ type: 'FORWARD' }, { type: 'FORWARD' }, { type: 'FORWARD' }],
        startPos: { x: 0, y: 0, dir: 1 },
        bot: { x: 0, y: 0, dir: 1 },
        // Reproduce the real failure: the bot can still look like it is at the
        // start while command 1 is already marked as executed.
        stepIndex: 0,
        tokensCollected: new Set(),
        status: 'IDLE',
        executing: false,
      };
      w.resetClicks = 0;
      w.executedCommands = 0;
      w.startExecution = function() {
        while (++w.AppState.stepIndex < w.AppState.commands.length) {
          if (w.AppState.commands[w.AppState.stepIndex].type === 'FORWARD') {
            w.AppState.bot.x += 1;
            w.executedCommands += 1;
          }
        }
      };
      w.handleCrash = function() {};
      w.checkGoalCondition = function() {};
      w.executeScan = function() {};
      w.activateWarpIfPresent = function() { return false; };

      doc.getElementById('btn-reset').addEventListener('click', () => {
        w.resetClicks += 1;
        w.AppState.bot = { ...w.AppState.startPos };
        w.AppState.stepIndex = -1;
        w.AppState.tokensCollected.clear();
        w.AppState.status = 'IDLE';
      });

      w.eval(source);
      w.startExecution();

      const snapshot = {
        resetClicks: w.resetClicks,
        executedCommands: w.executedCommands,
        x: w.AppState.bot.x,
        stepIndex: w.AppState.stepIndex,
      };
      frame.remove();
      return snapshot;
    });

    expect(result.resetClicks).toBe(1);
    expect(result.executedCommands).toBe(3);
    expect(result.x).toBe(3);
    expect(result.stepIndex).toBe(2);
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

test.describe('Bot Labyrinth desktop layout', () => {
  test.use({ viewport: { width: 1024, height: 576 } });

  test('desktop feedback docks in the algorithm column and frees room for a larger map', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('cybercode.tutorialDone', 'true');
    });
    await page.goto('/bot-labyrinth.html?teacher=1');
    await waitForGame(page);

    await expect.poll(() => page.evaluate(() => window.__IB_BOT_MESSAGE_ADDON_VERSION)).toBe('1.1.0');

    const slot = page.locator('#coach-message-slot');
    await expect(slot).toHaveClass(/coach-desktop-docked/);
    await expect(slot.locator('xpath=..')).toHaveAttribute('id', 'algorithm-panel');

    const shell = page.locator('#game-canvas-shell');
    const box = await shell.boundingBox();
    expect(box && box.width, 'desktop map should use the freed vertical space').toBeGreaterThanOrEqual(400);
  });
});
