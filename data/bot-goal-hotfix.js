(() => {
  if (typeof executeNextStep !== 'function' || typeof checkGoalCondition !== 'function') return;

  const originalExecuteNextStep = executeNextStep;

  executeNextStep = function(...args) {
    const result = originalExecuteNextStep.apply(this, args);

    if (!result || typeof AppState === 'undefined') return result;
    if (AppState.status === 'WON' || AppState.status === 'CRASHED') return result;

    const atGoal = AppState.bot.x === AppState.goalPos.x && AppState.bot.y === AppState.goalPos.y;
    const allTokens = AppState.tokensCollected.size >= AppState.tokensTotal;

    if (atGoal && allTokens) {
      if (typeof stopExecution === 'function') stopExecution();
      checkGoalCondition();
      return false;
    }

    return result;
  };
})();
