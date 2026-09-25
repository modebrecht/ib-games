const { test, expect } = require('@playwright/test');

async function waitForGame(page) {
  await expect(page.locator('body')).not.toContainText('Spiel wird geladen …', { timeout: 15000 });
  await expect(page.locator('body')).not.toContainText('Spiel konnte nicht geladen werden');
}

test.describe('Bot Labyrinth Level 10 boss', () => {
  test.use({ viewport: { width: 1024, height: 700 } });

  test('has a deterministic A-B-C-exit solution with no hidden timing state', async ({ page, request }) => {
    await page.addInitScript(() => {
      localStorage.setItem('cybercode.tutorialDone', 'true');
    });
    await page.goto('/bot-labyrinth.html?teacher=1');
    await waitForGame(page);

    const level = await page.evaluate(() => {
      const boss = LEVELS[9];
      return {
        title: boss.title,
        mission: boss.mission,
        par: boss.par,
        size: boss.size,
        start: boss.start,
        goal: boss.goal,
        tokens: boss.tokens,
        walls: boss.walls,
      };
    });

    expect(level.title).toContain('BOSS: CORE BREACH');
    expect(level.mission).toContain('A → B → C');
    expect(level.tokens).toEqual([
      { x: 2, y: 2 },
      { x: 6, y: 2 },
      { x: 6, y: 6 },
    ]);

    const response = await request.get('/data/bot-gameplay-boss.js');
    expect(response.ok()).toBeTruthy();
    const source = await response.text();
    expect(source).not.toContain('sweepActive');
    expect(source).not.toContain('AppState.stepIndex');
    expect(source).toContain('A ZUERST');
    expect(source).toContain('B ZUERST');

    const commands = [
      'LEFT', 'JUMP', 'RIGHT', 'JUMP', 'SCAN',
      'JUMP', 'JUMP', 'RIGHT', 'SCAN',
      'JUMP', 'JUMP', 'SCAN',
      'LEFT', 'JUMP', 'LEFT', 'JUMP',
    ];

    const dirs = ['N', 'E', 'S', 'W'];
    const vectors = {
      N: { dx: 0, dy: -1 },
      E: { dx: 1, dy: 0 },
      S: { dx: 0, dy: 1 },
      W: { dx: -1, dy: 0 },
    };
    const wallKeys = new Set(level.walls.map(({ x, y }) => `${x},${y}`));
    const tokenKeys = level.tokens.map(({ x, y }) => `${x},${y}`);
    const state = { x: level.start.x, y: level.start.y, dir: 'E', collected: 0 };

    const crossesVerticalGate = (fromX, fromY, toX, toY) => {
      if (fromY !== toY || fromY < 1 || fromY > 7) return false;
      return Math.min(fromX, toX) < 4 && Math.max(fromX, toX) >= 4;
    };
    const crossesHorizontalGate = (fromX, fromY, toX, toY) => {
      if (fromX !== toX || fromX < 4 || fromX > 8) return false;
      return Math.min(fromY, toY) < 4 && Math.max(fromY, toY) >= 4;
    };

    for (const command of commands) {
      if (command === 'LEFT' || command === 'RIGHT') {
        const current = dirs.indexOf(state.dir);
        state.dir = dirs[(current + (command === 'LEFT' ? 3 : 1)) % 4];
        continue;
      }

      if (command === 'SCAN') {
        const here = `${state.x},${state.y}`;
        expect(here, `SCAN ${state.collected + 1} must be on the next required core`).toBe(tokenKeys[state.collected]);
        state.collected += 1;
        continue;
      }

      const distance = command === 'JUMP' ? 2 : 1;
      const vec = vectors[state.dir];
      const nx = state.x + vec.dx * distance;
      const ny = state.y + vec.dy * distance;

      expect(nx).toBeGreaterThanOrEqual(0);
      expect(nx).toBeLessThan(level.size);
      expect(ny).toBeGreaterThanOrEqual(0);
      expect(ny).toBeLessThan(level.size);
      expect(wallKeys.has(`${nx},${ny}`), `landing ${nx},${ny} must not be a wall`).toBe(false);

      if (state.collected < 1) {
        expect(crossesVerticalGate(state.x, state.y, nx, ny), 'vertical gate must stay untouched before CORE A').toBe(false);
      }
      if (state.collected < 2) {
        expect(crossesHorizontalGate(state.x, state.y, nx, ny), 'horizontal gate must stay untouched before CORE B').toBe(false);
      }

      state.x = nx;
      state.y = ny;
    }

    expect(state.collected).toBe(3);
    expect({ x: state.x, y: state.y }).toEqual(level.goal);
    expect(commands.length).toBeLessThanOrEqual(level.par);
  });
});
