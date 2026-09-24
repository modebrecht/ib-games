(() => {
  'use strict';

  const VALUES = [8, 4, 2, 1];
  const START_TARGETS = [5, 6, 9];
  const TARGETS = [3, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15];
  const INTRO_KEY = 'bb-bitdrop-intro-v2';
  const TAB_OFF = 'mode-tab px-3 py-1 rounded-lg font-bold text-slate-400 hover:text-white transition';
  const TAB_ON = 'mode-tab px-3 py-1 rounded-lg font-bold bg-cyan-950 text-neonCyan border border-neonCyan/50 transition';
  const $ = id => document.getElementById(id);

  const state = {
    active:false, paused:false, round:0, target:5, lastTarget:null,
    collected:new Set(), queue:[], chip:null, next:null,
    score:0, combo:0, x:.42, y:0, drag:false, raf:0, lastTs:0,
    clearTimer:0, feedbackTimer:0
  };

  const required = target => VALUES.filter(v => (target & v) !== 0);
  const missing = () => required(state.target).filter(v => !state.collected.has(v));
  const total = () => [...state.collected].reduce((a,b) => a+b, 0);
  const equation = () => state.collected.size ? [...state.collected].sort((a,b)=>b-a).join(' + ') : '0';
  const choose = a => a[Math.floor(Math.random()*a.length)];
  const shuffled = a => {
    const r = a.slice();
    for (let i=r.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [r[i],r[j]]=[r[j],r[i]]; }
    return r;
  };
  const sfx = type => { try { if (typeof playSfx === 'function') playSfx(type); } catch (_) {} };

  function makeUI() {
    const zoom = $('zoomContainer');
    if (!zoom) return false;
    let tabs = $('mode-tabs') || $('tab-speedrun')?.parentElement;
    if (!tabs) return false;
    tabs.id = 'mode-tabs';

    let tab = $('tab-drop');
    if (!tab) {
      tab = document.createElement('button');
      tab.id = 'tab-drop'; tab.type = 'button'; tab.className = TAB_OFF;
      tab.textContent = '🧩 BIT-DROP';
      tab.title = 'Arcade: passende Bits sammeln, unpassende entsorgen';
      tab.onclick = () => window.switchMode('drop');
      const speed = $('tab-speedrun');
      speed?.nextSibling ? tabs.insertBefore(tab, speed.nextSibling) : tabs.appendChild(tab);
    }

    let view = $('view-drop');
    if (!view) {
      view = document.createElement('section');
      view.id = 'view-drop'; view.className = 'hidden bbd-view';
      zoom.appendChild(view);
    }

    view.innerHTML = `
      <div class="bbd-head">
        <div><small>4-BIT ARCADE · 8 | 4 | 2 | 1</small><h2>BIT-DROP</h2><p>Passende Werte sammeln. Unpassende rechts in den Papierkorb.</p></div>
        <div class="bbd-stats"><label>SCORE<b id="drop-score">0000</b></label><label>COMBO<b id="drop-combo">x0</b></label><button id="bbd-reset" title="Neu starten">↻</button></div>
      </div>
      <div class="bbd-math">
        <label>ZIEL<strong id="drop-target">5</strong></label>
        <label>DEINE BITS<strong id="bbd-equation">0 = 0</strong></label>
        <label>FEHLT<strong id="bbd-missing">5</strong></label>
        <label>NÄCHSTES<strong id="bbd-next">–</strong></label>
      </div>
      <div class="bbd-board" id="bbd-board">
        <div class="bbd-keep"><span>BITS SAMMELN</span><div class="bbd-sockets">${VALUES.map(v=>`<i data-value="${v}"><em>${v}</em><b>0</b></i>`).join('')}</div></div>
        <div class="bbd-trash" id="bbd-trash"><div>🗑️</div><b>PAPIERKORB</b><span>unpassend → hierhin</span></div>
        <div class="bbd-chip" id="bbd-chip"><span>4</span></div>
        <div class="bbd-feedback" id="bbd-feedback" aria-live="polite"></div>
        <div class="bbd-clear" id="bbd-clear" aria-live="assertive"></div>
      </div>
      <div class="bbd-controls"><button id="bbd-left">← SAMMELN</button><button id="bbd-fast">▼ DROP</button><button id="bbd-right">🗑️ ENTSORGEN →</button></div>
      <p class="bbd-tip">Unnötige Bits entsorgen ist richtig und kostet nichts. Ein benötigtes Bit kommt wieder.</p>
      <div class="bbd-intro hidden" id="bbd-intro"><div><small>30 SEKUNDEN</small><h3>So geht Bit-Drop</h3><ol><li>Baue die Zielzahl aus fallenden Bit-Werten.</li><li>Passende Bits <b>behalten</b>.</li><li>Unpassende Bits → <b>🗑️ Papierkorb</b>.</li></ol><button id="bbd-go">LOS GEHT'S</button></div></div>`;

    $('bbd-left').onclick = () => steer('keep');
    $('bbd-right').onclick = () => steer('trash');
    $('bbd-fast').onclick = hardDrop;
    $('bbd-reset').onclick = () => resetRun(true);
    $('bbd-go').onclick = closeIntro;

    const board = $('bbd-board');
    board.addEventListener('pointerdown', e => { if (!state.active || state.paused) return; state.drag=true; board.setPointerCapture?.(e.pointerId); pointerSteer(e); });
    board.addEventListener('pointermove', e => { if (state.drag && state.active && !state.paused) pointerSteer(e); });
    board.addEventListener('pointerup', () => state.drag=false);
    board.addEventListener('pointercancel', () => state.drag=false);
    return true;
  }

  function pointerSteer(e) {
    const r = $('bbd-board').getBoundingClientRect();
    state.x = Math.max(.08, Math.min(.92, (e.clientX-r.left)/Math.max(1,r.width)));
    renderChip();
  }

  function hideWidthControls(hide) {
    const wrap = $('btn-bit-4')?.parentElement;
    if (!wrap) return;
    if (hide) { if (!('bbdOldDisplay' in wrap.dataset)) wrap.dataset.bbdOldDisplay = wrap.style.display || '__empty__'; wrap.style.display='none'; }
    else if (wrap.dataset.bbdOldDisplay) { wrap.style.display = wrap.dataset.bbdOldDisplay==='__empty__' ? '' : wrap.dataset.bbdOldDisplay; delete wrap.dataset.bbdOldDisplay; }
  }

  function hookMode() {
    const original = window.switchMode;
    if (typeof original !== 'function' || original.__bbdV2) return;
    const wrapped = mode => {
      if (mode !== 'drop') {
        stopLoop(); state.active=false; state.drag=false;
        document.body.classList.remove('bb-drop-active');
        $('view-drop')?.classList.add('hidden'); $('tab-drop').className=TAB_OFF; hideWidthControls(false);
        return original(mode);
      }
      try { currentMode='drop'; } catch (_) {}
      try { if (typeof matrixInterval !== 'undefined' && matrixInterval) { clearInterval(matrixInterval); matrixInterval=null; } } catch (_) {}
      ['speedrun','duel','ascii','matrix'].forEach(m => { $('view-'+m)?.classList.add('hidden'); const t=$('tab-'+m); if(t)t.className=TAB_OFF; });
      $('view-drop').classList.remove('hidden'); $('tab-drop').className=TAB_ON;
      document.body.classList.add('bb-drop-active'); hideWidthControls(true); sfx('toggleOn'); startMode();
    };
    wrapped.__bbdV2=true; wrapped.__original=original; window.switchMode=wrapped;
  }

  function maybeIntro() {
    let seen=false; try { seen=localStorage.getItem(INTRO_KEY)==='1'; } catch (_) {}
    if (!seen) { state.paused=true; $('bbd-intro').classList.remove('hidden'); }
  }
  function closeIntro() { $('bbd-intro').classList.add('hidden'); try { localStorage.setItem(INTRO_KEY,'1'); } catch (_) {} state.paused=false; state.lastTs=performance.now(); }

  function pickTarget() {
    if (state.round <= START_TARGETS.length) return START_TARGETS[state.round-1];
    let pool=TARGETS.filter(n=>n!==state.lastTarget);
    if (state.round>7) pool=pool.filter(n=>required(n).length>=2);
    return choose(pool.length?pool:TARGETS);
  }

  function buildFairQueue() {
    const need=shuffled(missing());
    if (!need.length) return;
    const req=required(state.target);
    const pureDecoys=VALUES.filter(v=>!req.includes(v));
    const safeDupes=VALUES.filter(v=>state.collected.has(v));
    const decoys=pureDecoys.length?pureDecoys:safeDupes;
    const cap=state.round<=3?1:2;
    need.forEach(v => {
      const count=decoys.length ? (state.round<=2 ? (Math.random()<.35?1:0) : Math.floor(Math.random()*(cap+1))) : 0;
      for(let i=0;i<Math.min(2,count);i++) state.queue.push(choose(decoys));
      state.queue.push(v);
    });
  }
  function ensureQueue() { if (state.queue.length<3 && missing().length) buildFairQueue(); }

  function resetRun(show) {
    clearTimeout(state.clearTimer); clearTimeout(state.feedbackTimer);
    state.round=0; state.lastTarget=null; state.score=0; state.combo=0; state.queue=[]; state.collected.clear(); state.chip=null; state.next=null; state.paused=false;
    newRound(); if(show) feedback('↻ Bit-Drop neu gestartet','info');
  }
  function newRound() {
    state.round++; state.lastTarget=state.target; state.target=pickTarget(); state.collected.clear(); state.queue=[]; state.chip=null; state.next=null;
    buildFairQueue(); updateUI(); spawn();
  }

  function spawn() {
    if (!state.active || state.paused || state.chip) return;
    ensureQueue(); if(!state.queue.length)return;
    state.chip={value:state.queue.shift()}; state.x=.42; state.y=0; ensureQueue(); state.next=state.queue[0]??null; updateUI(); renderChip();
  }
  function duration() { if(state.round<=3)return 9000; if(state.round<=7)return 7200-(state.round-4)*300; return Math.max(4300,6100-(state.round-8)*160); }

  function startMode() {
    if(!state.active) { state.active=true; state.round===0?resetRun(false):(!state.chip&&spawn()); maybeIntro(); }
    stopLoop(); state.lastTs=performance.now(); state.raf=requestAnimationFrame(loop);
  }
  function stopLoop() { if(state.raf)cancelAnimationFrame(state.raf); state.raf=0; state.lastTs=0; }
  function loop(ts) {
    if(!state.active)return;
    if(!state.paused && state.chip) { const dt=Math.min(64,Math.max(0,ts-(state.lastTs||ts))); state.y+=dt/duration(); state.y>=1?resolve():renderChip(); }
    state.lastTs=ts; state.raf=requestAnimationFrame(loop);
  }

  function steer(where) { if(!state.chip||state.paused)return; state.x=where==='trash'?.86:.35; renderChip(); }
  function hardDrop() { if(!state.chip||state.paused)return; state.y=.995; renderChip(); }
  function resolve(force=null) {
    if(!state.chip||state.paused)return;
    const value=state.chip.value, zone=force||(state.x>=.74?'trash':'keep'); state.chip=null; state.y=0; renderChip();
    zone==='trash'?discard(value):collect(value);
    if(state.active&&!state.paused&&!state.chip)setTimeout(()=>{if(state.active&&!state.paused&&!state.chip)spawn();},220);
  }

  function discard(value) {
    const needed=missing().includes(value); trashAnim();
    if(needed) { feedback(`🗑️ ${value} entsorgt – du brauchst es noch. Es kommt wieder.`,'warn'); state.queue=[]; buildFairQueue(); }
    else feedback(`🗑️ ${value} entsorgt`,'trash');
    sfx('toggleOff'); ensureQueue(); updateUI();
  }
  function collect(value) {
    if(state.collected.has(value)) return mistake(`Schon aktiv! ${value} ist bereits gesetzt.`);
    if(!required(state.target).includes(value)) return mistake(`Zu viel! ${value} brauchst du für ${state.target} nicht.`);
    state.collected.add(value); state.score+=50; feedback(`+${value}`,'good'); sfx('toggleOn'); popSocket(value); updateUI();
    total()===state.target?finishRound():ensureQueue();
  }
  function mistake(text) { state.combo=0; feedback(text,'bad'); sfx('wrong'); const b=$('bbd-board'); b.classList.add('bbd-shake'); setTimeout(()=>b.classList.remove('bbd-shake'),360); updateUI(); ensureQueue(); }

  function finishRound() {
    state.paused=true; state.combo++; state.score+=500+Math.max(0,state.combo-1)*100; sfx('correct'); updateUI();
    const c=$('bbd-clear'); c.innerHTML=`<div><span>PERFEKT!</span><strong>${equation()} = ${state.target} ✓</strong><em>${state.combo>1?`x${state.combo} COMBO`:'ZIEL ERREICHT'}</em></div>`; c.classList.add('show'); $('bbd-board').classList.add('bbd-success');
    state.clearTimer=setTimeout(()=>{c.classList.remove('show'); $('bbd-board').classList.remove('bbd-success'); state.paused=false; newRound(); state.lastTs=performance.now();},1000);
  }

  function updateUI() {
    const now=total(); $('drop-target').textContent=state.target; $('drop-score').textContent=String(state.score).padStart(4,'0'); $('drop-combo').textContent='x'+state.combo;
    $('bbd-equation').textContent=`${equation()} = ${now}`; $('bbd-missing').textContent=Math.max(0,state.target-now); $('bbd-next').textContent=state.next??'–';
    document.querySelectorAll('.bbd-sockets i').forEach(el=>{const v=+el.dataset.value, on=state.collected.has(v), need=required(state.target).includes(v); el.classList.toggle('active',on); el.classList.toggle('needed',need&&!on); el.querySelector('b').textContent=on?'1':'0';});
  }
  function renderChip() {
    const el=$('bbd-chip'); if(!state.chip){el.classList.remove('show'); $('bbd-trash').classList.remove('hot'); return;}
    el.querySelector('span').textContent=state.chip.value; el.style.left=(state.x*100)+'%'; el.style.top=(8+state.y*72)+'%'; el.classList.add('show'); el.classList.toggle('trash',state.x>=.74); $('bbd-trash').classList.toggle('hot',state.x>=.74);
  }
  function feedback(text,kind) { const el=$('bbd-feedback'); clearTimeout(state.feedbackTimer); el.textContent=text; el.className=`bbd-feedback show ${kind}`; state.feedbackTimer=setTimeout(()=>el.className='bbd-feedback',kind==='bad'?1500:1100); }
  function popSocket(v) { const el=document.querySelector(`.bbd-sockets i[data-value="${v}"]`); if(!el)return; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); setTimeout(()=>el.classList.remove('pop'),420); }
  function trashAnim() { const el=$('bbd-trash'); el.classList.remove('eat'); void el.offsetWidth; el.classList.add('eat'); setTimeout(()=>el.classList.remove('eat'),430); }

  function keys(e) {
    if(!state.active||state.paused||$('view-drop').classList.contains('hidden'))return;
    if(e.key==='ArrowLeft'||e.key.toLowerCase()==='a'){e.preventDefault();steer('keep');}
    else if(e.key==='ArrowRight'||e.key.toLowerCase()==='d'){e.preventDefault();steer('trash');}
    else if(e.key==='ArrowDown'||e.key===' '){e.preventDefault();hardDrop();}
  }

  window.__bbDropV2={
    snapshot:()=>({round:state.round,target:state.target,required:required(state.target),collected:[...state.collected],missing:missing(),queue:state.queue.slice(),score:state.score,combo:state.combo,current:state.chip?.value??null,next:state.next}),
    forceTarget:n=>{if(!Number.isInteger(n)||n<1||n>15)throw new Error('target must be 1..15');state.target=n;state.collected.clear();state.queue=[];state.chip=null;buildFairQueue();spawn();updateUI();},
    resolveKeep:()=>resolve('keep'), resolveTrash:()=>resolve('trash'), requiredBits:required
  };

  if(!makeUI())return;
  hookMode();
  document.addEventListener('keydown',keys,{passive:false});
})();
