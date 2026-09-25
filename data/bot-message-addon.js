(() => {
  const VISIBLE_MS = 6000;
  const FADE_MS = 260;

  window.__IB_BOT_MESSAGE_ADDON_VERSION = '1.1.0';

  const toast = document.getElementById('toast-alert');
  const missionCard = document.getElementById('mission-card');
  const algorithmPanel = document.getElementById('algorithm-panel');
  const debugTip = document.getElementById('debug-tip');

  let toastHideTimer = null;
  let toastCleanupTimer = null;
  let debugHideTimer = null;
  let debugCleanupTimer = null;

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

    @media (min-width: 768px) {
      #coach-message-slot.coach-desktop-docked {
        width: calc(100% - 1rem) !important;
        max-width: none !important;
        height: auto !important;
        min-height: 2.5rem;
        margin: .25rem .5rem .35rem !important;
        padding: 0 !important;
        align-self: stretch;
      }
      #coach-message-slot.coach-desktop-docked #toast-alert {
        min-height: 2.25rem;
        padding: .4rem .65rem !important;
        font-size: 11px !important;
        line-height: 1.2 !important;
      }
    }

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

  let slot = null;
  if (toast && missionCard) {
    slot = document.getElementById('coach-message-slot');
    if (!slot) {
      slot = document.createElement('div');
      slot.id = 'coach-message-slot';
      slot.className = 'w-full max-w-md md:max-w-lg mb-1.5 h-10 sm:h-11 flex items-center';
      missionCard.insertAdjacentElement('afterend', slot);
    }
    slot.appendChild(toast);
  }

  const desktopQuery = window.matchMedia('(min-width: 768px)');

  function placeCoachSlot() {
    if (!slot || !missionCard) return;

    if (desktopQuery.matches && algorithmPanel) {
      slot.classList.add('coach-desktop-docked');
      const first = algorithmPanel.firstElementChild;
      if (first?.nextSibling) algorithmPanel.insertBefore(slot, first.nextSibling);
      else algorithmPanel.appendChild(slot);
      return;
    }

    slot.classList.remove('coach-desktop-docked');
    missionCard.insertAdjacentElement('afterend', slot);
  }

  placeCoachSlot();
  if (typeof desktopQuery.addEventListener === 'function') desktopQuery.addEventListener('change', placeCoachSlot);
  else if (typeof desktopQuery.addListener === 'function') desktopQuery.addListener(placeCoachSlot);

  if (toast) {
    const text = document.getElementById('toast-text');
    let wasClassActive = !toast.classList.contains('opacity-0');
    let lastMessage = text?.textContent?.trim() || '';

    const syncToast = () => {
      const raw = text?.textContent?.trim() || '';
      const friendly = studentMessage(raw);
      const classActive = !toast.classList.contains('opacity-0');
      const newCycle = classActive && (!wasClassActive || friendly !== lastMessage);

      if (text && friendly !== raw) text.textContent = friendly;

      if (!friendly) {
        clearTimeout(toastHideTimer);
        clearTimeout(toastCleanupTimer);
        if (!toast.classList.contains('opacity-0')) toast.classList.add('opacity-0');
        if (toast.style.visibility !== 'hidden') toast.style.visibility = 'hidden';
        wasClassActive = false;
        lastMessage = friendly;
        return;
      }

      if (newCycle) {
        clearTimeout(toastHideTimer);
        clearTimeout(toastCleanupTimer);
        if (toast.style.visibility !== 'visible') toast.style.visibility = 'visible';
        toastHideTimer = setTimeout(() => {
          if (!toast.classList.contains('opacity-0')) toast.classList.add('opacity-0');
          toastCleanupTimer = setTimeout(() => {
            if (toast.style.visibility !== 'hidden') toast.style.visibility = 'hidden';
          }, FADE_MS);
        }, VISIBLE_MS);
      }

      wasClassActive = classActive;
      lastMessage = friendly;
    };

    const toastObserver = new MutationObserver(syncToast);
    toastObserver.observe(toast, {
      attributes: true,
      attributeFilter: ['class'],
      childList: true,
      characterData: true,
      subtree: true,
    });
    syncToast();
  }

  if (debugTip) {
    const skipButton = debugTip.querySelector('#btn-skip-level');
    const copy = document.createElement('span');
    copy.innerHTML = '<strong>Festgefahren?</strong> Tippe auf <strong>SCHRITT</strong>. Der Bot führt dann nur einen Befehl aus – so siehst du sofort, wo es schiefgeht.';
    debugTip.replaceChildren(copy);
    if (skipButton) debugTip.appendChild(skipButton);

    let wasClassVisible = !debugTip.classList.contains('hidden');

    const syncDebugTip = () => {
      const classVisible = !debugTip.classList.contains('hidden');
      if (classVisible && !wasClassVisible) {
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
      wasClassVisible = classVisible;
    };

    const debugObserver = new MutationObserver(syncDebugTip);
    debugObserver.observe(debugTip, {
      attributes: true,
      attributeFilter: ['class'],
    });
    syncDebugTip();
  }
})();
