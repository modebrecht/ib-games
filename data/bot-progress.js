(() => {
  'use strict';

  const KEY = 'ib-games:progress:bot:v1';

  const read = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) || '{}');
      return {
        solved: Array.isArray(parsed.solved) ? parsed.solved.filter(Number.isInteger) : [],
        total: Number.isFinite(parsed.total) ? parsed.total : 0,
        percent: Number.isFinite(parsed.percent) ? parsed.percent : 0,
        mastered: parsed.mastered === true,
      };
    } catch (_) {
      return { solved: [], total: 0, percent: 0, mastered: false };
    }
  };

  const save = solved => {
    const total = typeof LEVELS !== 'undefined' && Array.isArray(LEVELS) ? LEVELS.length : 10;
    const unique = [...new Set(solved)].filter(index => index >= 0 && index < total).sort((a, b) => a - b);
    const percent = total > 0 ? Math.round((unique.length / total) * 100) : 0;
    const payload = { solved: unique, total, percent, mastered: percent >= 50 };
    try { localStorage.setItem(KEY, JSON.stringify(payload)); } catch (_) {}
    return payload;
  };

  const markSolved = index => {
    if (!Number.isInteger(index)) return read();
    const current = read();
    return save([...current.solved, index]);
  };

  if (typeof checkGoalCondition === 'function' && typeof AppState !== 'undefined') {
    const originalCheckGoalCondition = checkGoalCondition;
    checkGoalCondition = function(...args) {
      const levelIndex = AppState.currentLevelIndex;
      const result = originalCheckGoalCondition.apply(this, args);
      if (AppState.status === 'WON') markSolved(levelIndex);
      return result;
    };
  }

  window.__ibBotProgress = { key: KEY, read, markSolved };
})();
