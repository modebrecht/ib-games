const { test, expect } = require('@playwright/test');

test('diagnostic: inspect base Bot Labyrinth execution functions', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('cybercode.tutorialDone', 'true'));
  await page.route('**/data/bot-gameplay-*.js', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.route('**/data/bot-message-addon.js', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto('/bot-labyrinth.html?teacher=1');
  await expect(page.locator('body')).not.toContainText('Spiel wird geladen …', { timeout: 15000 });

  const dump = await page.evaluate(() => ({
    startExecution: typeof startExecution === 'function' ? startExecution.toString() : null,
    executeNextStep: typeof executeNextStep === 'function' ? executeNextStep.toString() : null,
    stopExecution: typeof stopExecution === 'function' ? stopExecution.toString() : null,
    executeSingleStep: typeof executeSingleStep === 'function' ? executeSingleStep.toString() : null,
    resetRobot: typeof resetRobot === 'function' ? resetRobot.toString() : null,
    resetLevel: typeof resetLevel === 'function' ? resetLevel.toString() : null,
    loadLevel: typeof loadLevel === 'function' ? loadLevel.toString() : null,
    status: typeof AppState !== 'undefined' ? AppState.status : null,
    stepIndex: typeof AppState !== 'undefined' ? AppState.stepIndex : null,
    appKeys: typeof AppState !== 'undefined' ? Object.keys(AppState) : [],
    timerGlobals: Object.keys(window).filter(key => /timer|timeout|exec|step|pause/i.test(key)).sort(),
  }));

  console.log('BOT_DIAGNOSTIC_START');
  console.log(JSON.stringify(dump));
  console.log('BOT_DIAGNOSTIC_END');
});
