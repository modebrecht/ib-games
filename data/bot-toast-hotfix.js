(() => {
  const VISIBLE_MS = 6000;
  const FADE_MS = 260;
  let hideTimer = null;
  let cleanupTimer = null;
  let debugHideTimer = null;
  let debugCleanupTimer = null;

  const toast = document.getElementById('toast-alert');
  const missionCard = document.getElementById('mission-card');

  if (toast && missionCard) {
    let slot = document.getElementById('coach-message-slot');
    if (!slot) {
      slot = document.createElement('div');
      slot.id = 'coach-message-slot';
      slot.className = 'w-full max-w-md md:max-w-lg mb-1.5 h-10 sm:h-11 flex items-center';
      missionCard.insertAdjacentElement('afterend', slot);
    }
    slot.appendChild(toast);
  }

  const style = document.createElement('style');
  style.textContent = `
    #coach-message-slot { flex: 0 0 auto; }
    #toast-alert {
      position: relative !important;
      inset: auto !important;
      left: auto !important;
      top: auto !important;
      transform: none !important;
      width: 100% !important;
      max-width: none !important;
      min-height: 2.5rem;
      margin: 0 !important;
      padding: .45rem .7rem !important;
      border-radius: .75rem !important;
      font-size: 11px !important;
      line-height: 1.25 !important;
      text-align: left !important;
      box-shadow: none !important;
      pointer-events: none !important;
    }
    #toast-alert.opacity-0 { transform: none !important; }
    @media (max-width: 767px) {
      #coach-message-slot { height: 2.4rem; margin-bottom: .25rem; }
      #toast-alert {
        min-height: 2.25rem;
        padding: .35rem .55rem !important;
        font-size: 10px !important;
        line-height: 1.2 !important;
      }
      #toast-icon svg { width: .85rem !important; height: .85rem !important; }
    }
  `;
  document.head.appendChild(style);

  function studentMessage(message) {
    if (!message) return '';
    if (message === 'Du hast einen Fehler gefunden – das nennt man Debugging.') return '';
    if (message.startsWith('Kollision mit Begrenzung')) return 'Der Bot fährt aus dem Spielfeld. Drehe ihn vorher oder ändere den Weg.';
    if (message.startsWith('Wand-Kollision')) return 'Der Bot fährt gegen eine Wand. Prüfe die Richtung vor diesem Schritt.';
    if (message.startsWith('Laser-Schaden')) return 'Der Bot fährt in den Laser. Nutze einen anderen Weg oder SPRUNG.';
    if (message.startsWith('Sprung ins Leere')) return 'Der Sprung landet außerhalb des Feldes. Ändere den Befehl davor.';
    if (message.startsWith('Sprung gegen eine Wand')) return 'Der Bot springt gegen eine Wand. Drehe ihn vorher oder wähle einen anderen Weg.';
    if (message.startsWith('Mitten in der Laser-Barriere')) return 'Der Bot landet im Laser. Ändere den Sprung oder die Richtung.';
    if (message.startsWith('Ziel erreicht, aber nur')) return 'Fast geschafft: Du bist im Ziel, aber es fehlen Daten. Fahre zu allen Datenfeldern und nutze SCAN.';
    if (message === 'Programm-Ende erreicht, aber das Ziel wurde verfehlt.') return 'Der Bot ist noch nicht im Ziel. Ändere einen Befehl oder füge einen weiteren hinzu.';
    if (message === 'Scan erfolglos: Kein Datenpaket auf diesem Feld.') return 'Hier liegt kein Datenpaket. Fahre zuerst auf ein Datenfeld und nutze dann SCAN.';
    if (message === 'Keine Befehle vorhanden! Füge zuerst Befehle hinzu.' || message === 'Füge zuerst Befehle zu deinem Algorithmus hinzu!') return 'Baue zuerst unten eine Befehlsfolge.';
    if (message.startsWith('Befehlsspeicher voll')) return 'Deine Befehlsfolge ist voll. Lösche einen Befehl oder vereinfache den Weg.';
    if (message.startsWith('Warp ') && message.includes('Richtung bleibt gleich')) {
      const id = message.match(/^Warp\s+([^\s]+)/)?.[1] || '';
      return `Warp ${id}: teleportiert. Der Bot schaut danach weiter in dieselbe Richtung.`;
    }
    return message;
  }

  if (typeof showToast === 'function') {
    showToast = function(message, type = 'warn') {
      const toastEl = document.getElementById('toast-alert');
      const text = document.getElementById('toast-text');
      const icon = document.getElementById('toast-icon');
      if (!toastEl || !text || !icon) return;

      const friendly = studentMessage(message);
      clearTimeout(hideTimer);
      clearTimeout(cleanupTimer);

      if (!friendly) {
        toastEl.style.visibility = 'hidden';
        toastEl.classList.add('opacity-0');
        return;
      }

      text.textContent = friendly;
      toastEl.style.visibility = 'visible';
      toastEl.style.pointerEvents = 'none';

      if (type === 'error') {
        icon.innerHTML = iconSvg('error', 'w-4 h-4');
        toastEl.className = 'px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-opacity duration-300 opacity-100 pointer-events-none border border-rose-500/70 bg-rose-950/75 text-rose-100 z-20 flex items-center gap-2';
      } else if (type === 'success') {
        icon.innerHTML = iconSvg('success', 'w-4 h-4');
        toastEl.className = 'px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-opacity duration-300 opacity-100 pointer-events-none border border-emerald-500/60 bg-emerald-950/70 text-emerald-100 z-20 flex items-center gap-2';
      } else {
        icon.innerHTML = iconSvg('info', 'w-4 h-4');
        toastEl.className = 'px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-opacity duration-300 opacity-100 pointer-events-none border border-cyan-500/50 bg-cyan-950/55 text-cyan-100 z-20 flex items-center gap-2';
      }

      hideTimer = setTimeout(() => {
        toastEl.classList.add('opacity-0');
        cleanupTimer = setTimeout(() => {
          toastEl.style.visibility = 'hidden';
        }, FADE_MS);
      }, VISIBLE_MS);
    };
  }

  const debugTip = document.getElementById('debug-tip');
  if (debugTip) {
    const skipButton = debugTip.querySelector('#btn-skip-level');
    const copy = document.createElement('span');
    copy.innerHTML = '<strong>Festgefahren?</strong> Tippe auf <strong>SCHRITT</strong>. Der Bot führt dann nur einen Befehl aus – so siehst du sofort, wo es schiefgeht.';
    debugTip.replaceChildren(copy);
    if (skipButton) debugTip.appendChild(skipButton);
  }

  if (typeof revealDebugTip === 'function') {
    const originalRevealDebugTip = revealDebugTip;
    revealDebugTip = function(...args) {
      const wasAlreadyShown = typeof AppState !== 'undefined' && AppState.debugTipShown;
      const result = originalRevealDebugTip.apply(this, args);
      const tip = document.getElementById('debug-tip');

      if (!wasAlreadyShown && tip && !tip.classList.contains('hidden')) {
        clearTimeout(debugHideTimer);
        clearTimeout(debugCleanupTimer);
        tip.style.opacity = '1';
        tip.style.transition = `opacity ${FADE_MS}ms ease`;
        debugHideTimer = setTimeout(() => {
          tip.style.opacity = '0';
          debugCleanupTimer = setTimeout(() => tip.classList.add('hidden'), FADE_MS);
        }, VISIBLE_MS);
      }
      return result;
    };
  }
})();