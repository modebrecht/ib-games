(() => {
  const VISIBLE_MS = 6000;
  const FADE_MS = 320;
  let toastHideTimer = null;
  let toastCleanupTimer = null;
  let debugHideTimer = null;
  let debugCleanupTimer = null;

  const style = document.createElement('style');
  style.textContent = `
    #toast-alert { pointer-events: none !important; }
    @media (max-width: 767px) {
      #toast-alert {
        top: .5rem !important;
        max-width: min(86%, 22rem) !important;
        font-size: 11px !important;
        line-height: 1.3 !important;
        padding: .55rem .7rem !important;
      }
    }
  `;
  document.head.appendChild(style);

  if (typeof showToast === 'function') {
    showToast = function(message, type = 'warn') {
      const toast = document.getElementById('toast-alert');
      const text = document.getElementById('toast-text');
      const icon = document.getElementById('toast-icon');
      if (!toast || !text || !icon) return;

      clearTimeout(toastHideTimer);
      clearTimeout(toastCleanupTimer);
      toast.style.visibility = 'visible';
      toast.style.pointerEvents = 'none';
      text.textContent = message;

      if (type === 'error') {
        icon.innerHTML = iconSvg('error', 'w-4 h-4');
        toast.className = 'absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all duration-300 opacity-100 pointer-events-none transform translate-y-0 border border-rose-500 bg-rose-950 text-rose-200 shadow-lg z-20 flex items-center gap-2';
      } else if (type === 'success') {
        icon.innerHTML = iconSvg('success', 'w-4 h-4');
        toast.className = 'absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all duration-300 opacity-100 pointer-events-none transform translate-y-0 border border-emerald-500 bg-emerald-950 text-emerald-200 shadow-neon-emerald z-20 flex items-center gap-2';
      } else {
        icon.innerHTML = iconSvg('info', 'w-4 h-4');
        toast.className = 'absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all duration-300 opacity-100 pointer-events-none transform translate-y-0 border border-cyan-500 bg-cyan-950 text-cyan-200 shadow-neon-cyan z-20 flex items-center gap-2';
      }

      toastHideTimer = setTimeout(() => {
        toast.classList.add('opacity-0', '-translate-y-2');
        toastCleanupTimer = setTimeout(() => {
          toast.style.visibility = 'hidden';
        }, FADE_MS);
      }, VISIBLE_MS);
    };
  }

  if (typeof revealDebugTip === 'function') {
    const originalRevealDebugTip = revealDebugTip;
    revealDebugTip = function(...args) {
      const wasAlreadyShown = typeof AppState !== 'undefined' && AppState.debugTipShown;
      const result = originalRevealDebugTip.apply(this, args);

      if (!wasAlreadyShown) {
        const debugTip = document.getElementById('debug-tip');
        if (debugTip && !debugTip.classList.contains('hidden')) {
          clearTimeout(debugHideTimer);
          clearTimeout(debugCleanupTimer);
          debugTip.style.opacity = '1';
          debugTip.style.transition = `opacity ${FADE_MS}ms ease`;
          debugHideTimer = setTimeout(() => {
            debugTip.style.opacity = '0';
            debugCleanupTimer = setTimeout(() => {
              debugTip.classList.add('hidden');
            }, FADE_MS);
          }, VISIBLE_MS);
        }
      }

      return result;
    };
  }
})();
