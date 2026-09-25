(() => {
  'use strict';

  const KEY = 'ib-games:progress:byte:v1';
  const MODULES = ['speedrun', 'drop', 'ascii', 'matrix'];
  const REQUIRED_SIGNALS = 3;

  const safeParse = value => {
    const match = String(value ?? '').match(/-?\d+/);
    return match ? Number(match[0]) : 0;
  };

  const read = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) || '{}');
      return {
        masteredModules: Array.isArray(parsed.masteredModules)
          ? parsed.masteredModules.filter(name => MODULES.includes(name))
          : [],
        signals: parsed.signals && typeof parsed.signals === 'object' ? parsed.signals : {},
        percent: Number.isFinite(parsed.percent) ? parsed.percent : 0,
        mastered: parsed.mastered === true,
      };
    } catch (_) {
      return { masteredModules: [], signals: {}, percent: 0, mastered: false };
    }
  };

  const save = state => {
    const masteredModules = [...new Set(state.masteredModules)].filter(name => MODULES.includes(name));
    const percent = Math.round((masteredModules.length / MODULES.length) * 100);
    const payload = {
      masteredModules,
      signals: state.signals || {},
      percent,
      mastered: percent >= 50,
    };
    try { localStorage.setItem(KEY, JSON.stringify(payload)); } catch (_) {}
    return payload;
  };

  const mark = module => {
    if (!MODULES.includes(module)) return read();
    const current = read();
    return save({ ...current, masteredModules: [...current.masteredModules, module] });
  };

  const addSignal = module => {
    if (!MODULES.includes(module)) return read();
    const current = read();
    const nextSignals = { ...current.signals, [module]: Math.max(0, Number(current.signals[module]) || 0) + 1 };
    const next = { ...current, signals: nextSignals };
    if (nextSignals[module] >= REQUIRED_SIGNALS) next.masteredModules = [...current.masteredModules, module];
    return save(next);
  };

  const observeStreak = (id, module) => {
    const el = document.getElementById(id);
    if (!el) return;
    const check = () => { if (safeParse(el.textContent) >= REQUIRED_SIGNALS) mark(module); };
    new MutationObserver(check).observe(el, { childList: true, characterData: true, subtree: true });
    check();
  };

  const observeIncreasingScore = (el, module) => {
    if (!el) return;
    let previous = safeParse(el.textContent);
    const check = () => {
      const current = safeParse(el.textContent);
      if (current > previous) addSignal(module);
      previous = current;
    };
    new MutationObserver(check).observe(el, { childList: true, characterData: true, subtree: true });
  };

  observeStreak('sr-streak-display', 'speedrun');
  observeStreak('drop-combo', 'drop');
  observeIncreasingScore(document.getElementById('matrix-score'), 'matrix');

  const asciiView = document.getElementById('view-ascii');
  if (asciiView) {
    const streak = asciiView.querySelector('[id*="streak" i]');
    const score = asciiView.querySelector('[id*="score" i]');
    if (streak) observeStreak(streak.id, 'ascii');
    else if (score) observeIncreasingScore(score, 'ascii');
  }

  window.__ibByteProgress = { key: KEY, read, mark, addSignal };
})();
