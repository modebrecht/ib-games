(() => {
  if (typeof AppState === 'undefined' || typeof LEVELS === 'undefined') return;

  const RHYTHM_LEVEL_INDEX = 4;
  const ACTIVE_PARITY = 0; // even command beats are dangerous

  // ---------------------------------------------------------------------------
  // Level 5 becomes the first timing challenge.
  // The route is intentionally simple so the new idea is the timing, not maze
  // reading. WAIT shifts all following commands by one beat.
  // ---------------------------------------------------------------------------
  LEVELS[RHYTHM_LEVEL_INDEX] = {
    id: 5,
    title: '5. Takt-Laser',
    desc: 'Laser wechseln nach jedem Befehl zwischen AN und AUS. Nutze WARTEN, um den richtigen Takt zu treffen.',
    mission: 'Passiere beide Takt-Laser im richtigen Moment und erreiche das Ziel.',
    takeaway: 'Timing kann Teil eines Algorithmus sein: WARTEN verschiebt, wann der nächste Befehl ausgeführt wird.',
    size: 7,
    par: 4,
    start: { x: 0, y: 3, dir: DIR.EAST },
    goal: { x: 6, y: 3 },
    tokens: [],
    walls: [
      {x: 0, y: 2}, {x: 1, y: 2}, {x: 2, y: 2}, {x: 3, y: 2}, {x: 4, y: 2}, {x: 5, y: 2}, {x: 6, y: 2},
      {x: 0, y: 4}, {x: 1, y: 4}, {x: 2, y: 4}, {x: 3, y: 4}, {x: 4, y: 4}, {x: 5, y: 4}, {x: 6, y: 4}
    ],
    hazards: [],
    rhythmicHazards: [
      { x: 2, y: 3, id: 'A' },
      { x: 5, y: 3, id: 'B' }
    ],
    warps: []
  };

  // ---------------------------------------------------------------------------
  // WAIT command: unlocked from Level 5 onward.
  // ---------------------------------------------------------------------------
  if (typeof SVG_ICON_PATHS !== 'undefined') {
    SVG_ICON_PATHS.pause = '<path d="M8 5v14M16 5v14"/>';
  }

  if (typeof CMD_METADATA !== 'undefined') {
    CMD_METADATA.WAIT = {
      label: 'WARTEN',
      icon: 'pause',
      desc: '1 Takt warten',
      border: 'border-sky-500/40',
      text: 'text-sky-300'
    };
  }

  if (typeof COMMAND_UNLOCKS !== 'undefined' && !COMMAND_UNLOCKS.some(list => list.includes('WAIT'))) {
    const prior = COMMAND_UNLOCKS[COMMAND_UNLOCKS.length - 1] || ['FORWARD', 'TURN_L', 'TURN_R', 'SCAN', 'JUMP'];
    COMMAND_UNLOCKS.push([...prior, 'WAIT']);
  }

  const grid = document.getElementById('command-grid');
  if (grid && !grid.querySelector('[data-cmd="WAIT"]')) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.cmd = 'WAIT';
    button.setAttribute('aria-label', 'Befehl Warten hinzufügen');
    button.className = 'cmd-add-btn group hidden flex flex-col items-center justify-center p-2 rounded-xl bg-slate-900 border border-sky-500/40 hover:border-sky-400 active:scale-95 transition-all shadow-sm';
    button.innerHTML = `
      <span class="group-hover:scale-110 transition-transform text-sky-300">${iconSvg('pause', 'w-4 h-4')}</span>
      <span class="text-[10px] font-mono font-bold text-sky-300 mt-1">Warten</span>
    `;
    grid.appendChild(button);
  }

  const style = document.createElement('style');
  style.textContent = `
    #command-grid.p2-has-wait { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
    .p2-wait-step {
      border-color: rgb(56 189 248) !important;
      background: rgba(12,74,110,.55) !important;
      box-shadow: 0 0 18px rgba(56,189,248,.48) !important;
    }
    #game-canvas-shell.p2-wait-pulse {
      box-shadow: inset 0 0 24px rgba(56,189,248,.13), 0 0 20px rgba(56,189,248,.18);
    }
    @media (min-width: 768px) {
      #command-grid.p2-has-wait { grid-template-columns: repeat(6, minmax(0, 1fr)) !important; }
    }
  `;
  document.head.appendChild(style);

  if (typeof updateCommandPalette === 'function') {
    const originalUpdateCommandPalette = updateCommandPalette;
    updateCommandPalette = function(...args) {
      const result = originalUpdateCommandPalette.apply(this, args);
      const allowed = new Set(allowedCommandsForLevel(AppState.currentLevelIndex));
      const commandGrid = document.getElementById('command-grid');
      commandGrid?.classList.toggle('p2-has-wait', allowed.has('WAIT'));
      return result;
    };
  }

  if (typeof levelIntroMessage === 'function') {
    const originalLevelIntroMessage = levelIntroMessage;
    levelIntroMessage = function(index, lvl) {
      if (index === RHYTHM_LEVEL_INDEX) {
        return 'Neu: WARTEN. Die Laser wechseln nach jedem Befehl: Rot = AN, Blau = AUS.';
      }
      return originalLevelIntroMessage(index, lvl);
    };
  }

  if (typeof updateMechanicHint === 'function') {
    const originalUpdateMechanicHint = updateMechanicHint;
    updateMechanicHint = function(lvl) {
      if (Array.isArray(lvl?.rhythmicHazards) && lvl.rhythmicHazards.length) {
        const hint = document.getElementById('mechanic-hint');
        if (hint) {
          hint.textContent = 'TAKT-LASER · ROT = AN · BLAU = AUS · WARTEN = 1 TAKT';
          hint.classList.remove('hidden');
        }
        return;
      }
      return originalUpdateMechanicHint(lvl);
    };
  }

  function rhythmHazards() {
    return LEVELS[AppState.currentLevelIndex]?.rhythmicHazards || [];
  }

  function beatIndex() {
    return AppState.stepIndex < 0 ? 0 : AppState.stepIndex;
  }

  function lasersActive(step = beatIndex()) {
    return Math.abs(step % 2) === ACTIVE_PARITY;
  }

  function segmentTouchesRhythmLaser(x1, y1, x2, y2) {
    return rhythmHazards().filter(gate => {
      // Gate x=N sits on the vertical border between columns N-1 and N,
      // limited to the configured row. Both FORWARD and JUMP can cross it.
      if (y1 !== gate.y || y2 !== gate.y) return false;
      const minX = Math.min(x1, x2);
      const maxX = Math.max(x1, x2);
      return minX < gate.x && maxX >= gate.x;
    });
  }

  function crashOnActiveRhythmLaser(fromX, fromY, toX, toY) {
    if (!lasersActive()) return false;
    const hits = segmentTouchesRhythmLaser(fromX, fromY, toX, toY);
    if (!hits.length) return false;
    const id = hits[0].id ? ` ${hits[0].id}` : '';
    handleCrash(`Takt-Laser${id} ist AN! Nutze WARTEN, damit du ihn im AUS-Takt passierst.`);
    return true;
  }

  if (typeof executeForward === 'function') {
    const originalExecuteForward = executeForward;
    executeForward = function(...args) {
      const vec = DIR_VECTORS[AppState.bot.dir];
      const targetX = AppState.bot.x + vec.dx;
      const targetY = AppState.bot.y + vec.dy;
      if (crashOnActiveRhythmLaser(AppState.bot.x, AppState.bot.y, targetX, targetY)) return false;
      return originalExecuteForward.apply(this, args);
    };
  }

  if (typeof executeJump === 'function') {
    const originalExecuteJump = executeJump;
    executeJump = function(...args) {
      const vec = DIR_VECTORS[AppState.bot.dir];
      const targetX = AppState.bot.x + vec.dx * 2;
      const targetY = AppState.bot.y + vec.dy * 2;
      if (crashOnActiveRhythmLaser(AppState.bot.x, AppState.bot.y, targetX, targetY)) return false;
      return originalExecuteJump.apply(this, args);
    };
  }

  if (typeof executeNextStep === 'function') {
    const originalExecuteNextStep = executeNextStep;
    executeNextStep = function(...args) {
      const nextIndex = AppState.stepIndex + 1;
      const nextType = AppState.commands[nextIndex]?.type;
      const result = originalExecuteNextStep.apply(this, args);

      if (nextType === 'WAIT' && result) {
        sound?.playClick?.();
        haptic?.(5);
        const item = document.getElementById(`tape-item-${AppState.stepIndex}`);
        item?.classList.add('p2-wait-step');
        const shell = document.getElementById('game-canvas-shell');
        shell?.classList.add('p2-wait-pulse');
        setTimeout(() => {
          item?.classList.remove('p2-wait-step');
          shell?.classList.remove('p2-wait-pulse');
        }, Math.max(150, Math.min(420, AppState.speedMs || 230)));
        render();
      }

      return result;
    };
  }

  // ---------------------------------------------------------------------------
  // Canvas overlay for rhythmic laser gates. Base renderer stays untouched.
  // ---------------------------------------------------------------------------
  function drawRhythmLaser(hazard, cellSize, active) {
    const px = (hazard.x - .5) * cellSize;
    const py = hazard.y * cellSize;
    const cx = hazard.x * cellSize;
    const top = py + cellSize * .12;
    const bottom = py + cellSize * .88;
    const pulse = .76 + Math.sin(animTimer * .16) * .16;

    ctx.save();

    // Gate frame / readable state background.
    ctx.fillStyle = active ? `rgba(127,29,29,${.16 + pulse * .07})` : 'rgba(8,47,73,.20)';
    ctx.strokeStyle = active ? 'rgba(251,113,133,.88)' : 'rgba(56,189,248,.55)';
    ctx.lineWidth = Math.max(1.4, cellSize * .025);
    ctx.setLineDash(active ? [] : [Math.max(3, cellSize * .08), Math.max(3, cellSize * .06)]);
    ctx.beginPath();
    ctx.roundRect(cx - cellSize * .18, py + cellSize * .08, cellSize * .36, cellSize * .84, Math.max(5, cellSize * .08));
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);

    // Emitters.
    [top, bottom].forEach(y => {
      const r = Math.max(3, cellSize * .075);
      ctx.beginPath();
      ctx.arc(cx, y, r, 0, Math.PI * 2);
      ctx.fillStyle = active ? '#fb7185' : '#38bdf8';
      ctx.shadowColor = active ? '#fb7185' : '#38bdf8';
      ctx.shadowBlur = active ? Math.max(10, cellSize * .22) : Math.max(5, cellSize * .1);
      ctx.fill();
    });

    // Beam.
    ctx.beginPath();
    ctx.moveTo(cx, top + cellSize * .05);
    ctx.lineTo(cx, bottom - cellSize * .05);
    ctx.strokeStyle = active ? '#fff1f2' : 'rgba(125,211,252,.48)';
    ctx.lineWidth = active ? Math.max(4, cellSize * .075) : Math.max(2, cellSize * .035);
    ctx.shadowColor = active ? '#f43f5e' : '#38bdf8';
    ctx.shadowBlur = active ? Math.max(16, cellSize * .3) : Math.max(7, cellSize * .12);
    ctx.stroke();

    // State label: readable even when color distinction is weak.
    ctx.shadowBlur = 0;
    ctx.font = `800 ${Math.max(8, cellSize * .14)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = active ? '#fecdd3' : '#bae6fd';
    ctx.fillText(active ? 'AN' : 'AUS', cx, py + cellSize * .5);

    ctx.restore();
  }

  if (typeof render === 'function') {
    const originalRender = render;
    render = function(...args) {
      const result = originalRender.apply(this, args);
      const hazards = rhythmHazards();
      if (!hazards.length) return result;
      const width = parseFloat(canvas.style.width) || 320;
      const cellSize = width / AppState.gridSize;
      const active = lasersActive();
      hazards.forEach(h => drawRhythmLaser(h, cellSize, active));
      return result;
    };
  }
})();
