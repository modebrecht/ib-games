// Bot Labyrinth gameplay core rules.
// Production module: reaching the goal with all required data ends the run immediately.

(() => {
  if (typeof executeNextStep !== 'function' || typeof checkGoalCondition !== 'function') return;

  const originalExecuteNextStep = executeNextStep;

  function goalIsComplete() {
    if (typeof AppState === 'undefined') return false;
    if (!AppState.bot || !AppState.goalPos) return false;
    if (AppState.status === 'WON' || AppState.status === 'CRASHED') return false;

    const atGoal = AppState.bot.x === AppState.goalPos.x && AppState.bot.y === AppState.goalPos.y;
    const collected = AppState.tokensCollected?.size ?? 0;
    const required = AppState.tokensTotal ?? 0;
    const allTokens = collected >= required;

    return atGoal && allTokens;
  }

  function finishGoalNow() {
    if (!goalIsComplete()) return false;

    // Let the game's own goal handler award/show the win, then cancel execution.
    // Do not let any already queued command move the bot out of the goal again.
    checkGoalCondition();
    if (typeof stopExecution === 'function') stopExecution();
    return true;
  }

  executeNextStep = function(...args) {
    // A timeout from the previous command may already be queued. If the bot is
    // already on the completed goal, that queued command must never execute.
    if (finishGoalNow()) return false;

    const result = originalExecuteNextStep.apply(this, args);

    // executeNextStep in the base game does not guarantee a truthy return value,
    // so goal resolution must be based on state, not on `result`.
    if (finishGoalNow()) return false;

    return result;
  };
})();
