(() => {
  if (typeof AppState === 'undefined' || typeof LEVELS === 'undefined') return;

  // PACKAGE 3 — route choice / risk-reward levels. No new command type here.
  // Each mission keeps the same core programming model but offers more than one
  // valid strategy so pupils can compare solutions instead of finding one tunnel.

  LEVELS[5] = {
    id: 6,
    title: '6. Sprung oder Umweg?',
    desc: 'Der direkte Weg ist kurz, aber blockiert. Springst du über die Firewalls oder programmierst du den sicheren Umweg?',
    mission: 'Erreiche das Ziel. Finde danach eine zweite Lösung mit weniger Befehlen.',
    takeaway: 'Dasselbe Problem kann mehrere korrekte Algorithmen haben. Manche sind kürzer als andere.',
    size: 7,
    par: 3,
    start: { x: 0, y: 3, dir: DIR.EAST },
    goal: { x: 6, y: 3 },
    tokens: [],
    walls: [],
    hazards: [{ x: 1, y: 3 }, { x: 3, y: 3 }],
    warps: []
  };

  LEVELS[6] = {
    id: 7,
    title: '7. Warp-Abkürzung',
    desc: 'Die Mauer kann außen umgangen werden. Warp A ist aber viel schneller.',
    mission: 'Erreiche das Ziel. Entscheide selbst: sicher außen herum oder Warp-Abkürzung?',
    takeaway: 'Eine Abkürzung verändert den Algorithmus: weniger Schritte können dieselbe Aufgabe lösen.',
    size: 7,
    par: 4,
    start: { x: 0, y: 6, dir: DIR.EAST },
    goal: { x: 6, y: 0 },
    tokens: [],
    walls: [
      {x: 3, y: 1}, {x: 3, y: 2}, {x: 3, y: 3}, {x: 3, y: 4}, {x: 3, y: 5}
    ],
    hazards: [],
    warps: [
      { id: 'A', a: { x: 2, y: 6 }, b: { x: 4, y: 1 } }
    ]
  };

  LEVELS[7] = {
    id: 8,
    title: '8. Daten-Switch',
    desc: 'Zwei Datenkerne, zwei mögliche Reihenfolgen. Der Rand-Warp verbindet beide Seiten.',
    mission: 'Scanne beide Datenkerne und erreiche das Ziel. Links oder rechts zuerst? Du entscheidest.',
    takeaway: 'Die Reihenfolge darf unterschiedlich sein, solange am Ende alle Bedingungen erfüllt sind.',
    size: 7,
    par: 15,
    start: { x: 3, y: 6, dir: DIR.NORTH },
    goal: { x: 3, y: 0 },
    tokens: [{ x: 1, y: 3 }, { x: 5, y: 3 }],
    walls: [{x: 3, y: 2}, {x: 3, y: 3}, {x: 3, y: 4}],
    hazards: [],
    warps: [
      { id: 'A', a: { x: 0, y: 3 }, b: { x: 6, y: 3 } }
    ]
  };

  LEVELS[8] = {
    id: 9,
    title: '9. Drei Wege',
    desc: 'Drei Routen zum selben Ziel: kurzer Takt-Korridor, Warp-Abkürzung oder langer sicherer Weg.',
    mission: 'Erreiche das Ziel. Teste danach eine andere Route und vergleiche die Anzahl Befehle.',
    takeaway: 'Algorithmen sind Entscheidungen: schnell, einfach oder robust können unterschiedliche Lösungen ergeben.',
    size: 9,
    par: 5,
    start: { x: 0, y: 4, dir: DIR.EAST },
    goal: { x: 8, y: 4 },
    tokens: [],
    walls: [
      {x: 2, y: 3}, {x: 3, y: 3}, {x: 4, y: 3}, {x: 5, y: 3}, {x: 6, y: 3},
      {x: 2, y: 5}, {x: 3, y: 5}, {x: 4, y: 5}, {x: 5, y: 5}, {x: 6, y: 5}
    ],
    hazards: [],
    rhythmicHazards: [
      { x: 3, y: 4, id: 'A' },
      { x: 6, y: 4, id: 'B' }
    ],
    warps: [
      { id: 'A', a: { x: 2, y: 2 }, b: { x: 6, y: 2 } }
    ]
  };

  const package3Intros = {
    5: 'WEGWAHL: Erst lösen. Dann versuche dieselbe Mission mit weniger Befehlen.',
    6: 'WEGWAHL: Die Mauer hat einen langen Weg außen herum – Warp A ist die Abkürzung.',
    7: 'WEGWAHL: Beide Datenkerne sind Pflicht. Welche Seite du zuerst nimmst, ist deine Entscheidung.',
    8: 'CHALLENGE: TAKT, WARP oder SICHER – drei Wege, ein Ziel.'
  };

  if (typeof levelIntroMessage === 'function') {
    const previousLevelIntroMessage = levelIntroMessage;
    levelIntroMessage = function(index, lvl) {
      if (package3Intros[index]) return package3Intros[index];
      return previousLevelIntroMessage(index, lvl);
    };
  }

  // Small in-world lane labels for Level 9. These are map markings, not overlays:
  // they never cover the bot or block interaction.
  function drawLaneLabel(text, x, y, cellSize, color) {
    ctx.save();
    ctx.font = `800 ${Math.max(8, cellSize * .13)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.globalAlpha = .78;
    ctx.fillText(text, (x + .5) * cellSize, (y + .5) * cellSize);
    ctx.restore();
  }

  if (typeof render === 'function') {
    const previousRender = render;
    render = function(...args) {
      const result = previousRender.apply(this, args);
      if (AppState.currentLevelIndex !== 8) return result;
      const width = parseFloat(canvas.style.width) || 320;
      const cellSize = width / AppState.gridSize;
      drawLaneLabel('WARP', 4, 2, cellSize, '#c4b5fd');
      drawLaneLabel('TAKT', 4, 4, cellSize, '#fda4af');
      drawLaneLabel('SICHER', 4, 6, cellSize, '#86efac');
      return result;
    };
  }
})();
