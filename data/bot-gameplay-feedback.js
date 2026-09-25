(() => {
  if (typeof AppState === 'undefined') return;

  const SPEEDS = { slow: 480, normal: 230, turbo: 90 };
  const DEFAULT_OLD_SPEEDS = new Set([360, 380]);
  const shell = document.getElementById('game-canvas-shell');
  const playButton = document.getElementById('btn-play');
  const playLabel = document.getElementById('btn-play-label');

  let retryNeedsReset = false;

  const style = document.createElement('style');
  style.textContent = `
    .step-active {
      transform: scale(1.035) !important;
      box-shadow: 0 0 14px rgba(34,211,238,.82), 0 0 26px rgba(124,58,237,.34) !important;
    }
    .p1-step-error {
      border-color: rgb(244 63 94) !important;
      background: rgba(136,19,55,.55) !important;
      box-shadow: 0 0 0 2px rgba(244,63,94,.22), 0 0 20px rgba(244,63,94,.48) !important;
      animation: p1-command-error .34s ease 2;
    }
    .p1-step-success {
      border-color: rgb(16 185 129) !important;
      background: rgba(6,78,59,.48) !important;
      box-shadow: 0 0 18px rgba(16,185,129,.45) !important;
    }
    @keyframes p1-command-error {
      0%,100% { transform: translateX(0); }
      35% { transform: translateX(-5px); }
      70% { transform: translateX(5px); }
    }
    #game-canvas-shell.p1-scan-hit {
      animation: p1-scan-hit .42s ease-out;
    }
    #game-canvas-shell.p1-retry-ready {
      border-color: rgba(244,63,94,.46) !important;
    }
    @keyframes p1-scan-hit {
      0% { box-shadow: 0 0 0 rgba(16,185,129,0), 0 0 0 rgba(34,211,238,0); }
      45% { box-shadow: 0 0 30px rgba(16,185,129,.58), inset 0 0 28px rgba(34,211,238,.14); }
      100% { box-shadow: 0 0 0 rgba(16,185,129,0), 0 0 0 rgba(34,211,238,0); }
    }
    #btn-play.p1-retry,
    #btn-play-label.p1-retry {
      letter-spacing: .025em;
    }
    @media (prefers-reduced-motion: reduce) {
      .p1-step-error, #game-canvas-shell.p1-scan-hit { animation: none !important; }
    }
  `;
  document.head.appendChild(style);

  function mapCurrentSpeed() {
    if (DEFAULT_OLD_SPEEDS.has(AppState.speedMs)) AppState.speedMs = SPEEDS.normal;
    else if (AppState.speedMs === 700) AppState.speedMs = SPEEDS.slow;
    else if (AppState.speedMs === 140) AppState.speedMs = SPEEDS.turbo;
  }

  function clearAttemptFeedback() {
    document.querySelectorAll('.p1-step-error, .p1-step-success').forEach(el => {
      el.classList.remove('p1-step-error', 'p1-step-success');
    });
    shell?.classList.remove('p1-retry-ready');
    playButton?.classList.remove('p1-retry');
    playLabel?.classList.remove('p1-retry');
    playButton?.removeAttribute('data-retry-from-start');
    playButton?.removeAttribute('title');
  }

  function markFailedCommand(index) {
    const item = document.getElementById(`tape-item-${index}`);
    if (!item) return;
    item.classList.remove('step-active');
    item.classList.add('p1-step-error');
    item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function markCurrentSuccess() {
    const item = document.getElementById(`tape-item-${AppState.stepIndex}`);
    if (!item) return;
    item.classList.add('p1-step-success');
    setTimeout(() => item.classList.remove('p1-step-success'), 520);
  }

  function setRetryReady() {
    retryNeedsReset = true;
    if (playLabel) {
      playLabel.textContent = 'NOCHMAL';
      playLabel.classList.add('p1-retry');
    }
    if (playButton) {
      playButton.classList.add('p1-retry');
      playButton.dataset.retryFromStart = 'true';
      playButton.title = 'NOCHMAL startet wieder an der Ausgangsposition.';
    }
    shell?.classList.add('p1-retry-ready');
  }

  function resetToLevelStart() {
    const reset = document.getElementById('btn-reset');
    if (reset && !reset.disabled) {
      reset.click();
      return true;
    }
    if (typeof resetBot === 'function') {
      resetBot();
      return true;
    }
    return false;
  }

  function isFreshLevelStart() {
    const start = AppState.startPos;
    const bot = AppState.bot;
    const atStart = !!start && !!bot &&
      bot.x === start.x &&
      bot.y === start.y &&
      bot.dir === start.dir;
    const noExecutedCommand = (AppState.stepIndex ?? -1) === -1;
    const noCollectedData = (AppState.tokensCollected?.size ?? 0) === 0;
    return atStart && noExecutedCommand && noCollectedData;
  }

  function prepareFullRunFromStart() {
    // Classroom rule: a full run is deterministic. Any call that starts the
    // algorithm while it is not currently running begins at command 1 from the
    // level's original bot state. STEP remains the only way to continue from a
    // partially executed state.
    if (AppState.executing || AppState.commands?.length === 0) return;
    retryNeedsReset = false;
    if (!isFreshLevelStart()) resetToLevelStart();
  }

  mapCurrentSpeed();

  document.querySelectorAll('.speed-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-speed');
      if (SPEEDS[mode] != null) AppState.speedMs = SPEEDS[mode];
    });
  });

  if (typeof startExecution === 'function') {
    const originalStartExecution = startExecution;
    startExecution = function(...args) {
      prepareFullRunFromStart();
      clearAttemptFeedback();
      mapCurrentSpeed();
      return originalStartExecution.apply(this, args);
    };
  }

  if (typeof handleCrash === 'function') {
    const originalHandleCrash = handleCrash;
    handleCrash = function(...args) {
      const failedIndex = AppState.stepIndex;
      const result = originalHandleCrash.apply(this, args);
      markFailedCommand(failedIndex);
      setRetryReady();
      return result;
    };
  }

  if (typeof checkGoalCondition === 'function') {
    const originalCheckGoalCondition = checkGoalCondition;
    checkGoalCondition = function(...args) {
      const result = originalCheckGoalCondition.apply(this, args);
      if (AppState.status !== 'WON') setRetryReady();
      return result;
    };
  }

  if (typeof executeScan === 'function') {
    const originalExecuteScan = executeScan;
    executeScan = function(...args) {
      const before = AppState.tokensCollected?.size ?? 0;
      const result = originalExecuteScan.apply(this, args);
      const after = AppState.tokensCollected?.size ?? 0;
      if (after > before) {
        markCurrentSuccess();
        shell?.classList.remove('p1-scan-hit');
        void shell?.offsetWidth;
        shell?.classList.add('p1-scan-hit');
        setTimeout(() => shell?.classList.remove('p1-scan-hit'), 460);
        if (typeof haptic === 'function') haptic(10);
      }
      return result;
    };
  }

  if (typeof activateWarpIfPresent === 'function') {
    const originalActivateWarpIfPresent = activateWarpIfPresent;
    activateWarpIfPresent = function(...args) {
      const warped = originalActivateWarpIfPresent.apply(this, args);
      if (warped) markCurrentSuccess();
      return warped;
    };
  }
})();
