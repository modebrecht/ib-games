(() => {
  if (typeof LEVELS === 'undefined' || LEVELS.some(level => level.id === 10)) return;

  const bossLevel = {
    id: 10,
    title: "10. BOSS: CORE BREACH",
    desc: "Endkampf: Sichere drei Datenkerne, überlebe die Firewall und hacke dich durch drei Warp-Sektoren bis zum Core.",
    mission: "Sammle alle 3 Datenkerne, nutze Warp A, B und C und erreiche den Boss-Core.",
    takeaway: "Du hast geplant, getestet, debuggt und optimiert – genau so entsteht ein funktionierender Algorithmus.",
    boss: true,
    finale: true,
    size: 9,
    par: 15,
    start: { x: 0, y: 8, dir: DIR.EAST },
    goal: { x: 8, y: 1 },
    tokens: [{ x: 2, y: 8 }, { x: 7, y: 6 }, { x: 2, y: 1 }],
    walls: [
      {x: 4, y: 0}, {x: 4, y: 1}, {x: 4, y: 2}, {x: 4, y: 3}, {x: 4, y: 4}, {x: 4, y: 5}, {x: 4, y: 6}, {x: 4, y: 7}, {x: 4, y: 8},
      {x: 5, y: 0}, {x: 5, y: 1}, {x: 5, y: 2}, {x: 5, y: 3}, {x: 5, y: 4}, {x: 5, y: 5}, {x: 5, y: 6}, {x: 5, y: 7}, {x: 5, y: 8},
      {x: 0, y: 3}, {x: 1, y: 3}, {x: 2, y: 3}, {x: 3, y: 3},
      {x: 0, y: 4}, {x: 1, y: 4}, {x: 2, y: 4}, {x: 3, y: 4},
      {x: 0, y: 6}, {x: 1, y: 6}, {x: 2, y: 6}
    ],
    hazards: [
      {x: 6, y: 5}, {x: 7, y: 5}, {x: 8, y: 5},
      {x: 1, y: 7}, {x: 2, y: 7}
    ],
    warps: [
      { id: "A", a: { x: 3, y: 8 }, b: { x: 6, y: 6 } },
      { id: "B", a: { x: 7, y: 3 }, b: { x: 2, y: 2 } },
      { id: "C", a: { x: 3, y: 1 }, b: { x: 6, y: 1 } }
    ]
  };

  LEVELS.push(bossLevel);

  const select = document.getElementById('level-select');
  if (select && !Array.from(select.options).some(opt => opt.value === '9')) {
    const option = document.createElement('option');
    option.value = '9';
    option.textContent = bossLevel.title;
    select.appendChild(option);
  }

  if (AppState.teacherMode) {
    AppState.highestUnlockedLevel = LEVELS.length - 1;
  }
  refreshLevelSelector();

  const originalIntro = levelIntroMessage;
  levelIntroMessage = function(index, lvl) {
    if (index === 8) return 'Warp-Matrix: Kombiniere Warps, Scan und Sprung in einem Algorithmus.';
    if (index === 9) return 'BOSS: Drei Datenkerne. Drei Warp-Sektoren. Eine Firewall. Hacke den Core.';
    return originalIntro(index, lvl);
  };

  function drawBossCoreOverlay(gx, gy, cellSize) {
    const r = cellSize * .41;
    const pulse = (Math.sin(animTimer * .085) + 1) / 2;
    ctx.save();
    ctx.translate(gx, gy);

    const aura = ctx.createRadialGradient(0, 0, r * .05, 0, 0, r * 1.8);
    aura.addColorStop(0, `rgba(244,114,182,${.54 + pulse * .2})`);
    aura.addColorStop(.42, 'rgba(168,85,247,.27)');
    aura.addColorStop(1, 'rgba(88,28,135,0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.rotate(animTimer * .025);
    ctx.strokeStyle = '#f472b6';
    ctx.shadowColor = '#ec4899';
    ctx.shadowBlur = Math.max(10, cellSize * .2);
    ctx.lineWidth = Math.max(2, cellSize * .045);
    ctx.setLineDash([cellSize * .12, cellSize * .055]);
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.05, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.rotate(-animTimer * .018);
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = Math.max(1.5, cellSize * .03);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 3 * i;
      const px = Math.cos(a) * r * .7;
      const py = Math.sin(a) * r * .7;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    const core = ctx.createRadialGradient(0, 0, 0, 0, 0, r * .58);
    core.addColorStop(0, '#fff1f2');
    core.addColorStop(.2, '#f9a8d4');
    core.addColorStop(.58, '#a855f7');
    core.addColorStop(1, 'rgba(88,28,135,.18)');
    ctx.fillStyle = core;
    ctx.shadowColor = '#e879f9';
    ctx.shadowBlur = Math.max(10, cellSize * .18);
    ctx.beginPath();
    ctx.arc(0, 0, r * (.46 + pulse * .05), 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fdf4ff';
    for (let i = 0; i < 4; i++) {
      const a = animTimer * .022 + i * Math.PI / 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 1.2, Math.sin(a) * r * 1.2, Math.max(1.3, cellSize * .028), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    drawCanvasTarget(gx, gy, cellSize * .5, '#fdf4ff');
  }

  const originalRender = render;
  render = function() {
    originalRender();
    if (!LEVELS[AppState.currentLevelIndex]?.boss) return;

    const w = parseFloat(canvas.style.width) || 320;
    const cellSize = w / AppState.gridSize;
    const gx = AppState.goalPos.x * cellSize + cellSize / 2;
    const gy = AppState.goalPos.y * cellSize + cellSize / 2;

    ctx.save();
    ctx.strokeStyle = 'rgba(244,114,182,.5)';
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 12;
    ctx.lineWidth = Math.max(2, cellSize * .035);
    ctx.strokeRect(2, 2, w - 4, w - 4);
    ctx.restore();

    drawBossCoreOverlay(gx, gy, cellSize);
  };

  const originalVictory = showVictoryModal;
  showVictoryModal = function() {
    originalVictory();
    const lvl = LEVELS[AppState.currentLevelIndex];
    const isBoss = !!lvl?.boss && AppState.currentLevelIndex === LEVELS.length - 1;

    const title = document.querySelector('#modal-victory h2');
    const replayBtn = document.getElementById('btn-vic-replay');
    const nextBtn = document.getElementById('btn-vic-next');

    if (isBoss) {
      if (title) title.textContent = 'SYSTEM GESICHERT!';
      document.getElementById('vic-level-name').textContent = 'BOT LABYRINTH ABGESCHLOSSEN · ' + lvl.title;
      document.getElementById('vic-badge').textContent = 'Alle 10 Missionen abgeschlossen!';
      document.getElementById('vic-learning').textContent = lvl.takeaway;
      if (replayBtn) replayBtn.textContent = 'Boss wiederholen';
      if (nextBtn) nextBtn.innerHTML = `Von vorne ${iconSvg('arrowRight', 'w-4 h-4 inline-block ml-1')}`;
    } else {
      if (title) title.textContent = 'Mission Erfüllt!';
      if (replayBtn) replayBtn.textContent = 'Wiederholen';
    }
  };

  const nextBtn = document.getElementById('btn-vic-next');
  if (nextBtn) {
    nextBtn.addEventListener('click', event => {
      const lvl = LEVELS[AppState.currentLevelIndex];
      if (!lvl?.finale) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      document.getElementById('modal-victory').classList.add('hidden');
      select.value = '0';
      loadLevel(0);
    }, true);
  }
})();