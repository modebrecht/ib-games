(() => {
  if (typeof AppState === 'undefined' || typeof LEVELS === 'undefined') return;

  const BOSS_INDEX = 9;
  const CORE_ORDER = [
    { x: 2, y: 2, id: 'A' },
    { x: 6, y: 2, id: 'B' },
    { x: 6, y: 6, id: 'C' }
  ];

  // PACKAGE 4 — a real three-phase finale. One programmed run can clear all
  // phases; the arena reconfigures after each successful core scan.
  LEVELS[BOSS_INDEX] = {
    id: 10,
    title: '10. BOSS: CORE BREACH',
    desc: 'Drei Sicherheitsphasen. Scanne CORE A, dann B, dann C. Nach jedem Scan verändert sich die Arena.',
    mission: 'Knacke CORE A → B → C und erreiche danach den Ausgang.',
    takeaway: 'Ein größerer Algorithmus kann aus mehreren Teilzielen bestehen. Nach jedem Teilziel gelten neue Bedingungen.',
    size: 9,
    par: 18,
    start: { x: 0, y: 4, dir: DIR.EAST },
    goal: { x: 8, y: 4 },
    tokens: CORE_ORDER.map(({x, y}) => ({ x, y })),
    walls: [
      {x: 1, y: 1}, {x: 1, y: 7},
      {x: 3, y: 0}, {x: 3, y: 8},
      {x: 5, y: 0}, {x: 5, y: 8},
      {x: 7, y: 1}, {x: 7, y: 7},
      {x: 4, y: 3}, {x: 4, y: 5}
    ],
    hazards: [],
    rhythmicHazards: [],
    warps: []
  };

  const shell = document.getElementById('game-canvas-shell');
  const missionText = document.getElementById('mission-text');
  let phaseFlashTimer = null;
  let finalBurstShown = false;

  const style = document.createElement('style');
  style.textContent = `
    #game-canvas-shell.p4-phase-burst {
      animation: p4-phase-burst .58s ease-out;
    }
    #game-canvas-shell.p4-final-burst {
      animation: p4-final-burst .9s ease-out;
    }
    @keyframes p4-phase-burst {
      0% { box-shadow: 0 0 0 rgba(34,211,238,0); }
      35% { box-shadow: 0 0 36px rgba(34,211,238,.58), inset 0 0 34px rgba(124,58,237,.18); }
      100% { box-shadow: 0 0 0 rgba(34,211,238,0); }
    }
    @keyframes p4-final-burst {
      0% { filter: brightness(1); }
      22% { filter: brightness(1.8); box-shadow: 0 0 46px rgba(16,185,129,.7); }
      55% { filter: brightness(1.18); box-shadow: 0 0 28px rgba(34,211,238,.55); }
      100% { filter: brightness(1); }
    }
    @media (prefers-reduced-motion: reduce) {
      #game-canvas-shell.p4-phase-burst,
      #game-canvas-shell.p4-final-burst { animation: none !important; }
    }
  `;
  document.head.appendChild(style);

  function inBoss() {
    return AppState.currentLevelIndex === BOSS_INDEX;
  }

  function collectedCount() {
    return AppState.tokensCollected?.size ?? 0;
  }

  function phase() {
    // After C is scanned, stay visually in phase 3 until the exit is reached.
    return Math.min(3, collectedCount() + 1);
  }

  function currentCore() {
    return CORE_ORDER[Math.min(collectedCount(), CORE_ORDER.length - 1)];
  }

  function beat() {
    return Math.max(0, AppState.stepIndex ?? 0);
  }

  function sweepActive() {
    // Alternates each command. WAIT therefore has a real purpose in the boss.
    return beat() % 2 === 0;
  }

  function updateBossMission() {
    if (!inBoss() || !missionText) return;
    const n = collectedCount();
    if (n <= 0) missionText.textContent = 'PHASE 1/3 · Schild aktiv · Scanne CORE A.';
    else if (n === 1) missionText.textContent = `PHASE 2/3 · Vertikal-Sweep ${sweepActive() ? 'AN' : 'AUS'} · Scanne CORE B.`;
    else if (n === 2) missionText.textContent = `PHASE 3/3 · Horizontal-Sweep ${sweepActive() ? 'AN' : 'AUS'} · Scanne CORE C.`;
    else missionText.textContent = `CORE OFFEN · Horizontal-Sweep ${sweepActive() ? 'AN' : 'AUS'} · Zum Ausgang!`;
  }

  function phaseBurst() {
    if (!shell) return;
    clearTimeout(phaseFlashTimer);
    shell.classList.remove('p4-phase-burst');
    void shell.offsetWidth;
    shell.classList.add('p4-phase-burst');
    phaseFlashTimer = setTimeout(() => shell.classList.remove('p4-phase-burst'), 620);
    if (typeof haptic === 'function') haptic(18);
    if (typeof sound !== 'undefined') sound?.playSuccess?.();
  }

  function setMissionTemporarily(text, ms = 1250) {
    if (!missionText) return;
    missionText.textContent = text;
    setTimeout(() => updateBossMission(), ms);
  }

  function crossesVerticalGate(fromX, fromY, toX, toY, gateX = 4) {
    if (fromY !== toY || fromY < 1 || fromY > 7) return false;
    const minX = Math.min(fromX, toX);
    const maxX = Math.max(fromX, toX);
    return minX < gateX && maxX >= gateX;
  }

  function crossesHorizontalGate(fromX, fromY, toX, toY, gateY = 4) {
    if (fromX !== toX || fromX < 4 || fromX > 8) return false;
    const minY = Math.min(fromY, toY);
    const maxY = Math.max(fromY, toY);
    return minY < gateY && maxY >= gateY;
  }

  function bossGateCrash(fromX, fromY, toX, toY) {
    if (!inBoss()) return false;
    const p = phase();

    if (p === 1 && crossesVerticalGate(fromX, fromY, toX, toY)) {
      handleCrash('CORE-Schild aktiv. Scanne zuerst CORE A.');
      return true;
    }

    if (p === 2 && sweepActive() && crossesVerticalGate(fromX, fromY, toX, toY)) {
      handleCrash('Security-Sweep ist AN. Nutze WARTEN und kreuze im AUS-Takt.');
      return true;
    }

    if (p === 3 && sweepActive() && crossesHorizontalGate(fromX, fromY, toX, toY)) {
      handleCrash('Security-Sweep ist AN. Nutze WARTEN und kreuze im AUS-Takt.');
      return true;
    }

    return false;
  }

  if (typeof executeForward === 'function') {
    const previousExecuteForward = executeForward;
    executeForward = function(...args) {
      if (inBoss()) {
        const vec = DIR_VECTORS[AppState.bot.dir];
        const tx = AppState.bot.x + vec.dx;
        const ty = AppState.bot.y + vec.dy;
        if (bossGateCrash(AppState.bot.x, AppState.bot.y, tx, ty)) return false;
      }
      return previousExecuteForward.apply(this, args);
    };
  }

  if (typeof executeJump === 'function') {
    const previousExecuteJump = executeJump;
    executeJump = function(...args) {
      if (inBoss()) {
        const vec = DIR_VECTORS[AppState.bot.dir];
        const tx = AppState.bot.x + vec.dx * 2;
        const ty = AppState.bot.y + vec.dy * 2;
        if (bossGateCrash(AppState.bot.x, AppState.bot.y, tx, ty)) return false;
      }
      return previousExecuteJump.apply(this, args);
    };
  }

  if (typeof executeScan === 'function') {
    const previousExecuteScan = executeScan;
    executeScan = function(...args) {
      if (!inBoss()) return previousExecuteScan.apply(this, args);

      const expectedIndex = Math.min(collectedCount(), CORE_ORDER.length - 1);
      const expected = CORE_ORDER[expectedIndex];
      const tokenHereIndex = CORE_ORDER.findIndex(core => core.x === AppState.bot.x && core.y === AppState.bot.y);

      if (tokenHereIndex >= 0 && tokenHereIndex !== expectedIndex && collectedCount() < CORE_ORDER.length) {
        setMissionTemporarily(`CORE ${CORE_ORDER[tokenHereIndex].id} ist gesperrt · zuerst CORE ${expected.id}.`);
        if (typeof haptic === 'function') haptic(8);
        return false;
      }

      const before = collectedCount();
      const result = previousExecuteScan.apply(this, args);
      const after = collectedCount();

      if (after > before) {
        phaseBurst();
        if (after === 1) setMissionTemporarily('CORE A GEKNACKT · Schild fällt · Phase 2!', 900);
        else if (after === 2) setMissionTemporarily('CORE B GEKNACKT · Sweep dreht · Phase 3!', 900);
        else if (after === 3) setMissionTemporarily('CORE C GEKNACKT · Ausgang offen!', 900);
      }

      return result;
    };
  }

  function drawCoreMarker(core, index, cellSize) {
    const cx = (core.x + .5) * cellSize;
    const cy = (core.y + .5) * cellSize;
    const done = collectedCount() > index;
    const active = collectedCount() === index;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${Math.max(8, cellSize * .15)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.fillStyle = done ? '#6ee7b7' : active ? '#fde68a' : '#94a3b8';
    ctx.shadowColor = done ? '#10b981' : active ? '#f59e0b' : '#475569';
    ctx.shadowBlur = active ? Math.max(10, cellSize * .18) : 5;
    ctx.fillText(done ? `✓${core.id}` : `CORE ${core.id}`, cx, cy - cellSize * .28);
    ctx.restore();
  }

  function drawBossCore(cellSize) {
    const cx = 4.5 * cellSize;
    const cy = 4.5 * cellSize;
    const n = collectedCount();
    const pulse = .82 + Math.sin((typeof animTimer !== 'undefined' ? animTimer : 0) * .13) * .12;

    ctx.save();
    for (let ring = 3; ring >= 1; ring--) {
      ctx.beginPath();
      ctx.arc(cx, cy, cellSize * (.10 + ring * .065), 0, Math.PI * 2);
      ctx.strokeStyle = n >= 3
        ? `rgba(16,185,129,${.18 + ring * .08})`
        : `rgba(${n === 0 ? '168,85,247' : n === 1 ? '244,63,94' : '34,211,238'},${.20 + ring * .08})`;
      ctx.lineWidth = Math.max(1.5, cellSize * .025);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(cx, cy, cellSize * .13 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = n >= 3 ? '#10b981' : n === 0 ? '#a855f7' : n === 1 ? '#f43f5e' : '#22d3ee';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = Math.max(14, cellSize * .3);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.font = `900 ${Math.max(8, cellSize * .13)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(n >= 3 ? 'OPEN' : `P${phase()}`, cx, cy);
    ctx.restore();
  }

  function drawVerticalBarrier(cellSize, active, shield = false) {
    const x = 4 * cellSize;
    const top = 1 * cellSize;
    const bottom = 8 * cellSize;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.strokeStyle = shield ? '#a78bfa' : active ? '#fb7185' : '#38bdf8';
    ctx.lineWidth = shield ? Math.max(7, cellSize * .10) : active ? Math.max(5, cellSize * .075) : Math.max(2, cellSize * .035);
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = shield ? 22 : active ? 18 : 7;
    if (!shield && !active) ctx.setLineDash([Math.max(4, cellSize * .09), Math.max(4, cellSize * .07)]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
    ctx.font = `900 ${Math.max(8, cellSize * .14)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.textAlign = 'center';
    ctx.fillStyle = shield ? '#ddd6fe' : active ? '#fecdd3' : '#bae6fd';
    ctx.fillText(shield ? 'SCHILD' : active ? 'AN' : 'AUS', x, cellSize * .72);
    ctx.restore();
  }

  function drawHorizontalSweep(cellSize, active) {
    const y = 4 * cellSize;
    const left = 4 * cellSize;
    const right = 9 * cellSize;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.strokeStyle = active ? '#fb7185' : '#38bdf8';
    ctx.lineWidth = active ? Math.max(5, cellSize * .075) : Math.max(2, cellSize * .035);
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = active ? 18 : 7;
    if (!active) ctx.setLineDash([Math.max(4, cellSize * .09), Math.max(4, cellSize * .07)]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
    ctx.font = `900 ${Math.max(8, cellSize * .14)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.textAlign = 'right';
    ctx.fillStyle = active ? '#fecdd3' : '#bae6fd';
    ctx.fillText(active ? 'SWEEP AN' : 'SWEEP AUS', right - cellSize * .12, y - cellSize * .12);
    ctx.restore();
  }

  if (typeof render === 'function') {
    const previousRender = render;
    render = function(...args) {
      const result = previousRender.apply(this, args);
      if (!inBoss()) return result;

      updateBossMission();
      const width = parseFloat(canvas.style.width) || 320;
      const cellSize = width / AppState.gridSize;
      const p = phase();
      const active = sweepActive();

      CORE_ORDER.forEach((core, i) => drawCoreMarker(core, i, cellSize));
      drawBossCore(cellSize);
      if (p === 1) drawVerticalBarrier(cellSize, true, true);
      else if (p === 2) drawVerticalBarrier(cellSize, active, false);
      else drawHorizontalSweep(cellSize, active);

      return result;
    };
  }

  if (typeof checkGoalCondition === 'function') {
    const previousCheckGoalCondition = checkGoalCondition;
    checkGoalCondition = function(...args) {
      const wasWon = AppState.status === 'WON';
      const result = previousCheckGoalCondition.apply(this, args);
      if (inBoss() && !wasWon && AppState.status === 'WON' && !finalBurstShown) {
        finalBurstShown = true;
        shell?.classList.remove('p4-final-burst');
        void shell?.offsetWidth;
        shell?.classList.add('p4-final-burst');
        if (typeof haptic === 'function') haptic([24, 45, 38]);
      }
      return result;
    };
  }

  if (typeof startExecution === 'function') {
    const previousStartExecution = startExecution;
    startExecution = function(...args) {
      if (inBoss()) finalBurstShown = false;
      return previousStartExecution.apply(this, args);
    };
  }
})();
