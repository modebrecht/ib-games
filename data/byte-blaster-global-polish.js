(() => {
  'use strict';
  const body = document.body;
  if (!body || body.dataset.bbGlobalPolish === '1') return;
  body.dataset.bbGlobalPolish = '1';
  body.classList.add('bb-global-polish');

  const views = ['speedrun','drop','duel','ascii','matrix'];
  const tabs = document.getElementById('mode-tabs');
  let lastMode = '';
  const visible = el => !!el && !el.classList.contains('hidden') && getComputedStyle(el).display !== 'none';
  const retrigger = (el, cls, ms=320) => {
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), ms);
  };

  function replaceTeamBattleCopy(root) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeValue && node.nodeValue.includes('Simultan-Duell')) {
        node.nodeValue = node.nodeValue.replaceAll('Simultan-Duell', 'Team Battle');
      }
    }
  }

  function centerActiveTab() {
    if (!tabs || window.innerWidth > 900) return;
    const active = tabs.querySelector('.mode-tab.bg-cyan-950:not(.hidden)');
    if (!active) return;
    const maxLeft = Math.max(0, tabs.scrollWidth - tabs.clientWidth);
    const wanted = active.offsetLeft - (tabs.clientWidth - active.offsetWidth) / 2;
    tabs.scrollLeft = Math.max(0, Math.min(maxLeft, wanted));
  }

  function syncMode() {
    const mode = views.find(name => visible(document.getElementById(`view-${name}`))) || 'speedrun';
    body.dataset.bbMode = mode;
    if (mode !== lastMode) {
      lastMode = mode;
      retrigger(document.getElementById(`view-${mode}`), 'bb-mode-enter', 360);
    }
    requestAnimationFrame(centerActiveTab);
  }

  replaceTeamBattleCopy(body);
  const milestoneToast = document.getElementById('milestoneToast');
  if (milestoneToast) {
    new MutationObserver(() => replaceTeamBattleCopy(milestoneToast))
      .observe(milestoneToast, {childList:true, characterData:true, subtree:true});
  }

  const watchIds = ['sr-target-number','duel-target-left','duel-target-right','ascii-char-target','ascii-dec-target','matrix-score','sr-current-sum','sr-streak-display','drop-target','drop-score','drop-combo'];
  const numberObserver = new MutationObserver(records => {
    records.forEach(record => retrigger(record.target.nodeType === 1 ? record.target : record.target.parentElement, 'bb-number-pop', 280));
  });
  watchIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) numberObserver.observe(el,{childList:true,characterData:true,subtree:true});
  });

  const modeObserver = new MutationObserver(syncMode);
  views.forEach(name => {
    const el = document.getElementById(`view-${name}`);
    if (el) modeObserver.observe(el,{attributes:true,attributeFilter:['class']});
  });

  document.addEventListener('click', e => {
    if (e.target.closest('.mode-tab')) setTimeout(syncMode,0);
  }, {passive:true});

  window.addEventListener('resize', () => requestAnimationFrame(syncMode), {passive:true});
  requestAnimationFrame(syncMode);
})();
