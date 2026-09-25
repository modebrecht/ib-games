(() => {
  if (typeof AppState === 'undefined' || typeof LEVELS === 'undefined') return;

  const BOSS_INDEX = 9;
  const CORE_ORDER = [
    { x: 2, y: 2, id: 'A' },
    { x: 6, y: 2, id: 'B' },
    { x: 6, y: 6, id: 'C' }
  ];

  // Level 10 is deliberately deterministic. Earlier versions tied barriers to
  // the global command index, which made the finale feel random to pupils.
  // The boss now has one clear rule: A opens the vertical gate, B opens the
  // horizontal gate, C opens the exit. No hidden timing/parity state.
  LEVELS[BOSS_INDEX] = {
    id: 10,
    title: '10. BOSS: CORE BREACH',
    desc: 'Drei Phasen, eine klare Reihenfolge: CORE A öffnet das erste Schild, CORE B das zweite, CORE C den Ausgang.',
    mission: 'Scanne CORE A → B → C und erreiche danach den Ausgang. Der GELBE Core ist immer dein nächstes Ziel.',
    takeaway: 'Große Algorithmen werden leichter, wenn du sie in klare Teilziele zerlegst: A, dann B, dann C, dann Ziel.',
    size: 9,
    par: 18,
    start: { x: 0, y: 4, dir: DIR.EAST },
    goal: { x: 8, y: 4 },
    tokens: CORE_ORDER.map(({ x, y }) => ({ x, y })),
    walls: [
      { x: 1, y: 1 }, { x: 1, y: 7 },
      { x: 3, y: 0 }, { x: 3, y: 8 },
      { x: 5, y: 0 }, { x: 5, y: 8 },
      { x: 7, y: 1 }, { x: 7, y: 7 },
      { x: 4, y: 3 }, { x: 4, y: 5 }
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
    return Math.min(3, collectedCount() + 1);
  }

  function currentCore() {
    return CORE_ORDER[Math.min(collectedCount(), CORE_ORDER.length - 1)];
  }

  function updateBossMission() {
    if (!inBoss() || !missionText) return;
    const n = collectedCount();

    if (n === 0) {
      missionText.textContent = 'PHASE 1/3 · GELB = nächstes Ziel · Scanne CORE A. Danach öffnet sich das mittlere Schild.';
    } else if (n === 1) {
      missionText.textContent = 'PHASE 2/3 · CORE A geschafft · Weg nach rechts OFFEN · Scanne jetzt CORE B.';
    } else if (n === 2) {
      missionText.textContent = 'PHASE 3/3 · CORE B geschafft · Weg nach unten OFFEN · Scanne jetzt CORE C.';
    } else {
      missionText.textContent = 'ALLE CORES GEKNACKT · Ausgang offen · Jetzt zum Ziel rechts!';
    }
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
    const n = collectedCount();

    // Gate 1 is a simple prerequisite, not a hidden timing puzzle.
    if (n < 1 && crossesVerticalGate(fromX, fromY, toX, toY)) {
      handleCrash('SCHILD GESPERRT · Erst CORE A scannen. Der gelbe Core zeigt dein nächstes Ziel.');
      return true;
    }

    // Gate 2 opens permanently after CORE B. No command-number parity involved.
    if (n < 2 && crossesHorizontalGate(fromX, fromY, toX, toY)) {
      handleCrash('SCHILD GESPERRT · Erst CORE B scannen. Danach öffnet sich der Weg nach unten.');
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
        setMissionTemporarily(`CORE ${CORE_ORDER[tokenHereIndex].id} ist noch gesperrt · zuerst CORE ${expected.id}.`);
        if (typeof haptic === 'function') haptic(8);
        return false;
      }

      const before = collectedCount();
      const result = previousExecuteScan.apply(this, args);
      const after = collectedCount();

      if (after > before) {
        phaseBurst();
        if (after === 1) setMissionTemporarily('CORE A GEKNACKT · Mittleres Schild OFFEN · Weiter zu B!', 1050);
        else if (after === 2) setMissionTemporarily('CORE B GEKNACKT · Unteres Schild OFFEN · Weiter zu C!', 1050);
        else if (after === 3) setMissionTemporarily('CORE C GEKNACKT · AUSGANG OFFEN!', 1050);
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
    ctx.fillText(done ? `✓${core.id}` : active ? `▶ CORE ${core.id}` : `CORE ${core.id}`, cx, cy - cellSize * .28);
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

  function drawBarrierLabel(text, x, y, cellSize, color) {
    ctx.save();
    ctx.font = `900 ${Math.max(8, cellSize * .12)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 5;
    ctx.fillText(text, x * cellSize, y * cellSize);
    ctx.restore();
  }

  function drawVerticalBarrier(cellSize, locked) {
    const x = 4 * cellSize;
    const top = 1 * cellSize;
    const bottom = 8 * cellSize;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.strokeStyle = locked ? '#a78bfa' : '#34d399';
    ctx.lineWidth = locked ? Math.max(7, cellSize * .10) : Math.max(2, cellSize * .035);
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = locked ? 22 : 7;
    if (!locked) ctx.setLineDash([Math.max(4, cellSize * .09), Math.max(4, cellSize * .07)]);
    ctx.stroke();
    ctx.restore();
    drawBarrierLabel(locked ? 'A ZUERST' : 'OFFEN', 4, .72, cellSize, locked ? '#ddd6fe' : '#a7f3d0');
  }

  function drawHorizontalBarrier(cellSize, locked) {
    const y = 4 * cellSize;
    const left = 4 * cellSize;
    const right = 9 * cellSize;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.strokeStyle = locked ? '#fb7185' : '#34d399';
    ctx.lineWidth = locked ? Math.max(7, cellSize * .10) : Math.max(2, cellSize * .035);
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = locked ? 20 : 7;
    if (!locked) ctx.setLineDash([Math.max(4, cellSize * .09), Math.max(4, cellSize * .07)]);
    ctx.stroke();
    ctx.restore();
    drawBarrierLabel(locked ? 'B ZUERST' : 'OFFEN', 7.65, 3.72, cellSize, locked ? '#fecdd3' : '#a7f3d0');
  }

  if (typeof render === 'function') {
    const previousRender = render;
    render = function(...args) {
      const result = previousRender.apply(this, args);
      if (!inBoss()) return result;

      updateBossMission();
      const width = parseFloat(canvas.style.width) || 320;
      const cellSize = width / AppState.gridSize;
      const n = collectedCount();

      CORE_ORDER.forEach((core, i) => drawCoreMarker(core, i, cellSize));
      drawBossCore(cellSize);

      if (n === 0) {
        drawVerticalBarrier(cellSize, true);
      } else if (n === 1) {
        drawVerticalBarrier(cellSize, false);
        drawHorizontalBarrier(cellSize, true);
      } else {
        drawHorizontalBarrier(cellSize, false);
      }

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
