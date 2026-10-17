/* زينب تلعب وتتعلم — screens. Depends on mascot.js and engine.js. */
(function () {
  const E = window.Engine, M = window.Mascot;
  const $app = document.getElementById('app');
  const KEY = 'zp:progress:v1';
  let DATA = null, MEDIA = null, P = null, S = null, STICKERS = null, Book, Toy = null, CLOUDS = {}, POPIT = {};   // S = current session

  /* ---------- storage ---------- */
  function load() { try { const s = localStorage.getItem(KEY); if (s) { const p = Object.assign(E.emptyProgress(), JSON.parse(s)); p.settings = Object.assign({}, E.DEFAULT_SETTINGS, p.settings || {}); if ((p.settings.v || 1) < 2) { p.settings.cardsPerSession = Math.max(p.settings.cardsPerSession, 8); p.settings.v = 2; } if (p.settings.v < 3) { p.settings.cardsPerSession = Math.max(p.settings.cardsPerSession, 10); if (p.settings.breakMinutes <= 20) p.settings.breakMinutes = 240; p.settings.v = 3; } if (p.settings.v < 4) { if (p.settings.unlockRatio >= 0.8) p.settings.unlockRatio = 0.6; p.settings.v = 4; } ensureStart(p); return p; } } catch (e) { console.warn('storage read failed', e); } return E.emptyProgress(); }
  /* Zaineb's first day with the app was 9 Oct 2026; the iPad log was reset once, so the log alone would under-count */
  function ensureStart(p) { if (!p.startDate) { const first = (p.sessions || []).map(s => s.date).sort()[0]; p.startDate = first && first < '2026-10-09' ? first : '2026-10-09'; } return p; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) { console.warn('storage write failed', e); } }

  /* ---------- audio: recorded clips through one unlocked <audio>; device voice only when a clip is missing ---------- */
  const Voice = {
    index: {}, el: null, unlocked: false, token: 0,
    async init() { try { this.index = await (await fetch('audio/voice.json', { cache: 'no-cache' })).json(); } catch (e) { this.index = {}; } this.el = new Audio(); this.el.preload = 'auto'; },
    unlock() { if (this.unlocked) return; this.unlocked = true; try { this.el.src = 'audio/_unlock.m4a'; this.el.play().catch(() => {}); } catch (e) {} },
    stop() { this.token++; try { this.el.pause(); } catch (e) {} try { speechSynthesis.cancel(); } catch (e) {} },
    play(key, text) {
      this.stop(); const my = this.token;
      return new Promise(res => {
        if (location.search.includes('mute')) return setTimeout(res, 300);     // dev: silent, fast
        const f = this.index[key];
        if (f) {
          const a = this.el; a.onended = a.onerror = () => { if (my === this.token) res(); }; a.src = 'audio/' + f;
          a.play().catch(() => res()); setTimeout(() => res(), 15000); return;
        }
        if (!text || key.startsWith('st:') || !('speechSynthesis' in window) || !speechSynthesis.getVoices().some(v => v.lang.startsWith('ar'))) return setTimeout(res, 600);   // sticker lines: Zouzou's clip or silence, never the device voice
        const u = new SpeechSynthesisUtterance(text.replace(/[ً-ْ]/g, '')); u.lang = 'ar'; u.rate = .85; u.onend = u.onerror = () => res(); speechSynthesis.speak(u);
        setTimeout(() => res(), 8000);
      });
    },
    async say(keys) { for (const [k, t] of keys) await this.play(k, t); }
  };
  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  /* ---------- tiny synth for the freeze-dance tune and soft sounds ---------- */
  const Sfx = {
    ctx: null, get() { if (!this.ctx) try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} return this.ctx; },
    tone(f, t0, d, g) { const c = this.get(); if (!c) return; const o = c.createOscillator(), v = c.createGain(); o.type = 'triangle'; o.frequency.value = f; v.gain.setValueAtTime(0, t0); v.gain.linearRampToValueAtTime(g || .18, t0 + .02); v.gain.exponentialRampToValueAtTime(.001, t0 + d); o.connect(v).connect(c.destination); o.start(t0); o.stop(t0 + d); },
    pop() { const c = this.get(); if (!c) return; this.tone(660, c.currentTime, .12); this.tone(880, c.currentTime + .1, .18); },
    sparkle() { const c = this.get(); if (!c) return; [523, 659, 784, 1047].forEach((f, i) => this.tone(f, c.currentTime + i * .09, .25, .14)); },
    hmm() { const c = this.get(); if (!c) return; this.tone(330, c.currentTime, .25, .12); this.tone(294, c.currentTime + .2, .3, .12); },
    snore: null,
    snoreStart() { const c = this.get(); if (!c || this.snore) return; if (c.state !== 'running') { c.resume().catch(() => {}); }
      const len = c.sampleRate * 2; const buf = c.createBuffer(1, len, c.sampleRate); const d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const master = c.createGain(); master.gain.value = 1; master.connect(c.destination); const st = { master, timer: null };
      const breath = (t0, dur, peak, f0, f1) => {       // one soft breath: hushed, low-passed air with a slow swell
        const n = c.createBufferSource(); n.buffer = buf; n.loop = true;
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = .7; lp.frequency.setValueAtTime(f0, t0); lp.frequency.linearRampToValueAtTime(f1, t0 + dur);
        const g = c.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(peak, t0 + dur * .45); g.gain.linearRampToValueAtTime(0, t0 + dur);
        n.connect(lp).connect(g).connect(master); n.start(t0); n.stop(t0 + dur + .05);
      };
      const cycle = () => {
        const t0 = c.currentTime;
        breath(t0, 1.7, .028, 380, 620);            // in
        breath(t0 + 1.9, 2.2, .034, 560, 300);      // out, a little longer and softer
        const o = c.createOscillator(), v = c.createGain(); o.type = 'sine'; o.frequency.value = 262;   // a tiny sleepy "mmm" on the way out
        v.gain.setValueAtTime(0, t0 + 1.9); v.gain.linearRampToValueAtTime(.012, t0 + 2.5); v.gain.linearRampToValueAtTime(0, t0 + 3.6);
        o.connect(v).connect(master); o.start(t0 + 1.9); o.stop(t0 + 3.7);
        st.timer = setTimeout(cycle, 5200 + Math.random() * 600);
      };
      cycle(); this.snore = st; },
    snoreStop() { if (!this.snore) return; const s = this.snore; this.snore = null; clearTimeout(s.timer); try { s.master.gain.setTargetAtTime(0, this.ctx.currentTime, .1); setTimeout(() => s.master.disconnect(), 500); } catch (e) {} },
    wake() { const c = this.get(); if (!c) return; const t0 = c.currentTime; const o = c.createOscillator(), v = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(220, t0); o.frequency.exponentialRampToValueAtTime(440, t0 + .7); o.frequency.exponentialRampToValueAtTime(330, t0 + 1.1);
      v.gain.setValueAtTime(0, t0); v.gain.linearRampToValueAtTime(.16, t0 + .15); v.gain.linearRampToValueAtTime(.001, t0 + 1.2); o.connect(v).connect(c.destination); o.start(t0); o.stop(t0 + 1.25); [660, 880, 1100].forEach((f, i) => this.tone(f, t0 + 1.2 + i * .1, .25, .12)); },
    stickerSound(kind) { const c = this.get(); if (!c) return; const t0 = c.currentTime;
      const glide = (f0, f1, at, d, g, type) => { const o = c.createOscillator(), v = c.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t0 + at); o.frequency.exponentialRampToValueAtTime(f1, t0 + at + d);
        v.gain.setValueAtTime(0, t0 + at); v.gain.linearRampToValueAtTime(g, t0 + at + .03); v.gain.exponentialRampToValueAtTime(.001, t0 + at + d); o.connect(v).connect(c.destination); o.start(t0 + at); o.stop(t0 + at + d + .05); };
      if (kind === 'glitter') { glide(600, 180, 0, .3, .3); glide(240, 760, .28, .3, .25, 'triangle'); [880, 1100, 1320].forEach((f, i) => this.tone(f, t0 + .6 + i * .1, .3, .18)); }      // squish + twinkle
      else if (kind === 'animal') { glide(220, 880, 0, .22, .32, 'triangle'); glide(880, 330, .22, .28, .25, 'triangle'); glide(330, 660, .5, .2, .2, 'triangle'); }          // boing-oing
      else if (kind === 'food') { glide(900, 300, 0, .12, .3); this.tone(1200, t0 + .15, .15, .22); this.tone(1500, t0 + .3, .2, .2); }                                        // pop pop
      else { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => this.tone(f, t0 + i * .08, .5, .2)); }                                                                          // twinkle up
    },
    popit(i) { const c = this.get(); if (!c) return; const t0 = c.currentTime; const f = 380 + Math.random() * 520;
      const o = c.createOscillator(), v = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(f * 1.6, t0); o.frequency.exponentialRampToValueAtTime(f * .55, t0 + .11);
      v.gain.setValueAtTime(.001, t0); v.gain.exponentialRampToValueAtTime(.4, t0 + .008); v.gain.exponentialRampToValueAtTime(.001, t0 + .16); o.connect(v).connect(c.destination); o.start(t0); o.stop(t0 + .17);
      const len = Math.floor(c.sampleRate * .03); const buf = c.createBuffer(1, len, c.sampleRate); const d = buf.getChannelData(0); for (let k = 0; k < len; k++) d[k] = (Math.random() * 2 - 1) * (1 - k / len);
      const src = c.createBufferSource(); src.buffer = buf; const g = c.createGain(); g.gain.value = .25; src.connect(g).connect(c.destination); src.start(t0); },
    pageTurn() { const c = this.get(); if (!c) return; const t0 = c.currentTime; const len = c.sampleRate * .5; const buf = c.createBuffer(1, len, c.sampleRate); const d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const n = c.createBufferSource(); n.buffer = buf; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(900, t0); f.frequency.exponentialRampToValueAtTime(2400, t0 + .3); f.Q.value = .8;
      const g = c.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.12, t0 + .08); g.gain.linearRampToValueAtTime(0, t0 + .4); n.connect(f).connect(g).connect(c.destination); n.start(t0); n.stop(t0 + .45); },
    fanfare() { const c = this.get(); if (!c) return; const t0 = c.currentTime;
      const notes = [[523, 0, .18], [659, .15, .18], [784, .3, .18], [1047, .45, .5], [784, .95, .14], [1047, 1.1, .7], [1319, 1.1, .7], [1568, 1.1, .9]];
      notes.forEach(([f, at, d]) => this.tone(f, t0 + at, d, .2)); [2093, 2637, 3136].forEach((f, i) => this.tone(f, t0 + 1.3 + i * .12, .4, .1)); },
    tune: null,
    startTune() { const c = this.get(); if (!c) return; this.stopTune(); const notes = [523, 587, 659, 523, 659, 698, 784, 784, 698, 659, 587, 523, 587, 659, 523]; let i = 0; const step = () => { this.tone(notes[i % notes.length], c.currentTime, .22, .16); i++; }; step(); this.tune = setInterval(step, 240); },
    stopTune() { if (this.tune) { clearInterval(this.tune); this.tune = null; } }
  };

  /* ---------- helpers ---------- */
  function h(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  function screen(cls, inner, scene) { $app.innerHTML = ''; const s = h(`<section class="screen ${cls}">${bg(scene)}${inner}</section>`); $app.appendChild(s); return s; }
  function bg(scene) {
    scene = scene || 'day'; const cl = (CLOUDS['bg-' + scene] || []).map((c, i) => `<img class="cloud3d" src="img/zouzou3d/${c.file}" alt="" style="left:${c.x}%;top:${c.y}%;width:${c.w}%;animation-duration:${38 + i * 11}s;animation-delay:${-i * 7}s">`).join('');
    return `<div class="bg bg3d" data-scene="${scene}"><div class="scene"><img class="sky" src="img/zouzou3d/bg-${scene}.webp" alt="">${cl}</div></div>`;
  }
  function confetti(n) {
    const c = h('<div class="confetti"></div>');
    for (let i = 0; i < (n || 18); i++) { const s = h(`<span>★</span>`); s.style.left = Math.random() * 100 + '%'; s.style.top = Math.random() * 30 + '%'; s.style.animationDelay = (Math.random() * .4) + 's'; s.style.color = ['#F5B820', '#FF8A71', '#5FAE52', '#6FA8DC'][i % 4]; c.appendChild(s); }
    $app.firstElementChild.appendChild(c); setTimeout(() => c.remove(), 2200);
  }
  function setMascot(el, state) { if (el) el.innerHTML = M.svg(state, { size: el.dataset.size || 220 }); }
  function pic(asset, cls, extra) { return `<div class="pic ${cls || ''}" data-asset="${asset}" ${extra || ''}><img src="img/${MEDIA.files[asset]}" alt="" draggable="false"></div>`; }
  function longPress(el, ms, fn) {
    let t = null; const start = (e) => { t = setTimeout(fn, ms); }; const end = () => { clearTimeout(t); };
    el.addEventListener('pointerdown', start); ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => el.addEventListener(ev, end));
  }
  const rnd = Math.random;

  /* ---------- HOME ---------- */
  let wasAsleep = false;
  function renderHome() {
    ensureStart(P);
    const can = E.canStart(P, new Date());
    const wakingUp = wasAsleep && can.ok; wasAsleep = !can.ok;
    const cur = E.currentStage(P, DATA.cards, DATA.levels);
    const bubble = can.ok ? (P.sessionCount === 0 ? 'أهلاً زينب! نلعبو؟' : 'يا زينب! نلعبو مرة أخرى؟')
                 : 'آني راقد زينب... مباعدة نلعبوا... زززز';
    const s = screen('home', `
      <div class="topbar"><div class="stars-row"><img class="star-img" src="img/zouzou3d/star.webp" alt=""><span>${P.stars}</span>${(() => { const n = E.daysSince(P.startDate, E.dateKey()); return n ? `<span class="streak" title="اليوم منذ البداية">🔥 يوم ${n}</span>` : ''; })()}</div>
        <h1 class="title">زينب تلعب وتتعلم</h1><button class="btn-book" id="book"><img class="book-img" src="img/zouzou3d/sticker-book.webp" alt=""><span>${((P.stickers || {}).got || []).length}</span></button></div>
      <div class="hero">
        <div class="mascot-wrap"><div class="bubble">${bubble}</div><div class="mascot-slot" data-size="260"></div></div>
        <div class="start-col"><button class="btn-big" id="start" ${can.ok ? '' : 'disabled'}>${can.ok ? 'نلعبو! ▶' : (can.reason === 'cap' ? 'غدوة إن شاء الله' : 'نرتاحو شويا')}</button>
        ${can.ok ? '' : '<div class="wait-chip" id="wait"></div>'}</div>
      </div>
      ${renderMap(cur)}`, can.ok ? 'day' : 'night');
    const slot = s.querySelector('.mascot-slot'); setMascot(slot, can.ok ? 'idle' : 'sleep');
    longPress(slot, 3000, openParent);
    if (!can.ok) { Sfx.snoreStart(); s.addEventListener('pointerdown', () => Sfx.snoreStart(), { once: true }); } else Sfx.snoreStop();
    if (wakingUp) { setMascot(slot, 'wave'); s.querySelector('.bubble').textContent = 'آآآه... راني فقت! نلعبو؟'; Sfx.wake(); setTimeout(() => setMascot(slot, 'idle'), 2500); }
    if (!can.ok) slot.addEventListener('click', () => {
      if (slot.dataset.busy) return; slot.dataset.busy = '1';
      const bub = s.querySelector('.bubble'); const old = bub.textContent; Voice.unlock();
      setMascot(slot, 'refuse'); bub.textContent = 'آني راقد زينب... مباعدة نلعبوا... زززز'; Voice.play('ui:5', 'آني راقد زينب... مباعدة نلعبوا');
      setTimeout(() => { setMascot(slot, 'sleep'); bub.textContent = old; delete slot.dataset.busy; }, 3200);
    });
    s.querySelector('#start').addEventListener('click', () => { if (E.canStart(P, new Date()).ok) { Voice.unlock(); Sfx.get(); Sfx.snoreStop(); startSession(); } });
    s.querySelector('#book').addEventListener('click', () => { Voice.unlock(); Sfx.get(); Sfx.snoreStop(); Sfx.pageTurn(); Book.book(); });
    s.querySelectorAll('.map .stop:not(.locked)').forEach(el => el.addEventListener('click', () => {
      if (!E.canStart(P, new Date()).ok) { el.classList.add('wiggle'); setTimeout(() => el.classList.remove('wiggle'), 1300); return; }
      Voice.unlock(); Sfx.get(); Sfx.snoreStop(); Sfx.pop(); startSession(+el.dataset.stage);
    }));
    if (!can.ok) {                                                              // the countdown until she can play again
      const chip = s.querySelector('#wait');
      const tick = () => {
        if (!$app.contains(chip)) return clearInterval(tm);
        const now = new Date(); const c2 = E.canStart(P, now);
        if (c2.ok) return renderHome();
        const ms = c2.reason === 'break' ? c2.waitMs : (new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) - now);
        const mins = Math.ceil(ms / 60000); const h = Math.floor(mins / 60), m = mins % 60;
        chip.textContent = '⏰ نلعبو مرة أخرى بعد ' + (h ? `${h} سا و ` : '') + `${m} د`;
      };
      tick(); const tm = setInterval(tick, 30000);
    }
    if (window.__pendingReload) location.reload();                               // a new version waited for the session to end
  }
  function renderMap(cur) {
    const pts = [[7, 30], [24, 62], [42, 30], [60, 62], [78, 30], [94, 62]];
    const path = pts.map((p, i) => (i ? 'L' : 'M') + (100 - p[0]) + ' ' + p[1]).join(' ');
    const stops = DATA.levels.map((l, i) => {
      const un = E.isUnlocked(P, DATA.cards, l.stage); const st = E.stageStats(P, DATA.cards, l.stage);
      const done = un && st.known >= Math.ceil(st.total * (P.settings.unlockRatio || .8));
      const cls = !un ? 'locked' : (done ? 'done' : (l.stage === cur ? 'current' : ''));
      return `<div class="stop ${cls}" data-stage="${l.stage}" style="right:${pts[i][0]}%;top:${pts[i][1]}%">
        ${l.stage === cur && un ? '<div class="mini">' + M.svg('idle', { size: 64 }) + '</div>' : ''}
        <div class="dot">${!un ? '🔒' : (done ? '✓' : l.stage)}</div><div class="name">${l.name}</div></div>`;
    }).join('');
    return `<div class="map"><svg class="path" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="${path}" stroke="#fff" stroke-width="3" fill="none" stroke-dasharray="4 3" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>${stops}</div>`;
  }

  /* ---------- SESSION ---------- */
  function startSession(stage) {
    const today = E.dateKey();
    const cards = stage ? E.buildPractice(P, DATA.cards, DATA.levels, stage, today, rnd) : E.buildSession(P, DATA.cards, DATA.levels, today);
    if (!cards.length) return;
    S = { cards, i: 0, results: {}, today, choices: E.choicesFor(P), practice: stage || null };
    showCard();
  }
  function card() { return S.cards[S.i]; }
  function media(c) { return MEDIA.cards[c.id] || { pics: [] }; }
  function assetOf(c) { const m = MEDIA.cards[c.id]; return m && m.pics && m.pics[0] || c.id; }
  function k(c, f) { return `c:${c.id}:${f}`; }

  function frame(c, inner, side) {
    const dots = S.cards.map((x, i) => `<i class="${i < S.i ? 'on' : (i === S.i ? 'now' : '')}"></i>`).join('');
    const s = screen('play', `
      <div class="topbar"><div class="progress">${dots}</div><div></div><button class="btn-home" id="home" aria-label="الرئيسية">⌂</button></div>
      <div class="card-area">${inner}${side ? `<div class="side">${side}</div>` : ''}</div>
      <div class="zouzou top peek"><div class="zbubble" hidden></div><div class="mascot-slot" data-size="210"></div></div>
      <div class="word hidden" id="word">${c.word}</div>
      <div class="hint ${P.settings.hints ? '' : 'off'}">${c.parent}</div>`);
    setMascot(s.querySelector('.zouzou .mascot-slot'), 'idle', 210);
    s.querySelector('#home').addEventListener('click', () => { Voice.stop(); Sfx.stopTune(); S = null; renderHome(); });
    return s;
  }
  function zouzou(state, text) {
    const el = $app.querySelector('.zouzou .mascot-slot'); const sz = +(el && el.dataset.size) || undefined; setMascot(el, state, sz); if (state !== 'idle') setTimeout(() => setMascot(el, 'idle', sz), 2200);
    const b = $app.querySelector('.zbubble'); if (!b) return;
    if (text) { b.textContent = text; b.hidden = false; b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); clearTimeout(b._t); b._t = setTimeout(() => { b.hidden = true; }, 4500); }
  }
  function showWord(c) { const w = $app.querySelector('#word'); if (w) w.classList.remove('hidden'); }

  async function correct(c, el) {
    if (el) el.classList.add('correct');
    const fb = DATA.feedback_lines.correct; const i = Math.floor(rnd() * fb.length);
    zouzou('clap', fb[i]); confetti(); Sfx.sparkle();
    await Voice.play(`fb:correct:${i}`, fb[i]);
  }
  async function tryAgain(c, target) {
    const fb = DATA.feedback_lines.try_again; const i = Math.floor(rnd() * fb.length);
    zouzou('tilt', fb[i]); Sfx.hmm();
    await Voice.play(`fb:try:${i}`, fb[i]);
    if (target) { target.classList.remove('wiggle'); void target.offsetWidth; target.classList.add('wiggle'); }
  }
  async function reveal(c, result) {
    S.results[c.id] = S.results[c.id] || result;
    showWord(c); zouzou('happy', c.reveal);
    await Voice.play(k(c, 'reveal'), c.reveal);
    const w = $app.querySelector('#word'); if (w) { w.classList.add('pop'); }
    $app.querySelectorAll('.pic').forEach(p => { p.onclick = () => Voice.play(k(c, 'word'), c.word); });
    const next = h('<button class="btn-next" id="next">➜</button>'); $app.firstElementChild.appendChild(next);
    const go = () => { if (S && S.cards[S.i] === c) { S.i++; S.i < S.cards.length ? showCard() : endSession(); } };
    next.addEventListener('click', go); setTimeout(go, 9000);
  }

  function showCard() {
    const c = card(); Voice.stop(); Sfx.stopTune();
    const t = c.type; const m = media(c);
    if (t === 'find') return playFind(c, m);
    if (t === 'count') return playCount(c, m);
    if (t === 'compare' && m.answer) return playChoice(c, m, m.pics, [m.answer], 'compare');
    if (t === 'odd') return playChoice(c, m, m.pics, [m.answer], 'odd');
    if (t === 'switch') return playSwitch(c, m);
    if (t === 'sequence') return playSequence(c, m);
    if (t === 'do') return playDo(c, m);
    if (t === 'silly') return playSilly(c, m);
    if (t === 'imagine' || t === 'story') return playOpen(c, m, 'تم ✓');
    return playAdult(c, m);          // say / describe / why / single-picture compare
  }

  function playFind(c, m) {
    const target = assetOf(c);
    const ds = E.pickDistractors(P, DATA.cards, c, S.choices - 1, rnd, assetOf).map(assetOf);
    const all = E.shuffle([target, ...ds], rnd);
    const s = frame(c, all.map(a => pic(a, 'tap ' + (all.length > 2 ? 'sm' : ''))).join(''));
    let wrong = false, done = false;
    s.querySelectorAll('.pic').forEach(p => p.addEventListener('click', async () => {
      if (done) return;
      if (p.dataset.asset === target) { done = true; await correct(c, p); reveal(c, wrong ? 'wrong' : 'correct'); }
      else { wrong = true; await tryAgain(c, s.querySelector(`.pic[data-asset="${target}"]`)); }
    }));
    Voice.play(k(c, 'ask'), c.ask);
  }
  function playChoice(c, m, pics, answers, kind) {
    const all = kind === 'odd' ? E.shuffle(pics, rnd) : pics;
    const s = frame(c, all.map(a => pic(a, 'tap ' + (all.length > 2 ? 'sm' : ''))).join(''));
    let wrong = false, done = false;
    s.querySelectorAll('.pic').forEach(p => p.addEventListener('click', async () => {
      if (done) return;
      if (answers.includes(p.dataset.asset)) { done = true; await correct(c, p); reveal(c, wrong ? 'wrong' : 'correct'); }
      else { wrong = true; await tryAgain(c, s.querySelector(`.pic[data-asset="${answers[0]}"]`)); }
    }));
    Voice.play(k(c, 'ask'), c.ask);
  }
  function playSwitch(c, m) {
    const all = E.shuffle(m.pics, rnd);
    const s = frame(c, `<div class="grid4">${all.map(a => pic(a, 'tap sm')).join('')}</div>`);
    let phase = 1, wrong = false, busy = false;
    s.querySelectorAll('.pic').forEach(p => p.addEventListener('click', async () => {
      if (busy) return; busy = true;
      const ok = (phase === 1 ? m.rule1 : m.rule2).includes(p.dataset.asset);
      if (ok && phase === 1) { p.classList.add('correct'); zouzou('happy', 'بدلنا اللعبة!'); Sfx.pop(); await Voice.play('ui:3', 'بدلنا اللعبة!'); phase = 2; s.querySelectorAll('.pic').forEach(x => x.classList.remove('correct')); }
      else if (ok) { await correct(c, p); busy = true; return reveal(c, wrong ? 'wrong' : 'correct'); }
      else { wrong = true; await tryAgain(c, null); }
      busy = false;
    }));
    Voice.play(k(c, 'ask'), c.ask);
  }
  function playAdult(c, m) {
    const s = frame(c, pic(m.pics[0] || assetOf(c), ''), `<div class="adult-btns"><button class="btn-adult ok" id="said">قالتها ✓</button><button class="btn-adult help" id="help">نعاونها</button></div>`);
    s.querySelector('#said').onclick = async () => { await correct(c, s.querySelector('.pic')); reveal(c, 'correct'); };
    s.querySelector('#help').onclick = async () => { zouzou('happy', 'نعاونوها مع بعض!'); reveal(c, 'help'); };
    Voice.play(k(c, 'ask'), c.ask);
  }
  function playOpen(c, m, label) {
    const s = frame(c, pic(m.pics[0] || assetOf(c), ''), `<button class="btn-adult ok big" id="done">${label}</button>`);
    s.querySelector('#done').onclick = async () => { zouzou('clap', 'يا سلام!'); confetti(); Sfx.sparkle(); reveal(c, 'correct'); };
    Voice.play(k(c, 'ask'), c.ask);
  }
  function playCount(c, m) {
    const n = m.count, a = m.pics[0];
    const inner = n === 5
      ? `<div class="pic big-hand">${pic(a, '').replace('<div class="pic "', '<div class="inner"')}<div class="dots">${[1, 2, 3, 4, 5].map(i => `<button class="dot-tap" data-n="${i}">${i}</button>`).join('')}</div></div>`
      : `<div class="count-row n${n}">${Array.from({ length: n }, (_, i) => pic(a, 'tap sm', `data-n="${i + 1}"`)).join('')}</div>`;
    const s = frame(c, inner);
    let next = 1;
    const items = s.querySelectorAll(n === 5 ? '.dot-tap' : '.count-row .pic');
    items.forEach(p => p.addEventListener('click', async () => {
      const i = +p.dataset.n; if (i !== next) return;
      p.classList.add('lit'); Sfx.pop(); next++;
      await Voice.play(`count:${i}`, ['واحد', 'اثنين', 'ثلاثة', 'أربعة', 'خمسة'][i - 1]);
      if (i === n) { await correct(c, null); reveal(c, 'correct'); }
    }));
    Voice.play(k(c, 'ask'), c.ask);
  }
  function playSequence(c, m) {
    const order = m.steps; const shuffled = E.shuffle(order, rnd);
    const s = frame(c, `<div class="seq"><div class="slots">${[1, 2, 3].map(i => `<div class="slot" data-i="${i}"><span>${i}</span></div>`).join('')}</div><div class="pool">${shuffled.map(a => pic(a, 'tap sm')).join('')}</div></div>`);
    let next = 0, wrong = false;
    s.querySelectorAll('.pool .pic').forEach(p => p.addEventListener('click', async () => {
      if (p.classList.contains('placed')) return;
      if (p.dataset.asset === order[next]) {
        p.classList.add('placed'); Sfx.pop(); const slot = s.querySelector(`.slot[data-i="${next + 1}"]`); slot.innerHTML = ''; slot.appendChild(p.cloneNode(true)); p.style.visibility = 'hidden'; next++;
        if (next === 3) { await correct(c, null); reveal(c, wrong ? 'wrong' : 'correct'); }
      } else { wrong = true; await tryAgain(c, s.querySelector(`.pool .pic[data-asset="${order[next]}"]`)); }
    }));
    Voice.play(k(c, 'ask'), c.ask);
  }
  function playDo(c, m) {
    const freeze = c.id === '4-09';
    const s = frame(c, m.pics.map(a => pic(a, m.pics.length > 1 ? 'sm' : '')).join(''), `<div class="timer"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" class="track"/><circle cx="50" cy="50" r="44" class="ring" id="ring"/></svg><div class="t" id="tnum">10</div></div>`);
    (async () => {
      await Voice.play(k(c, 'ask'), c.ask);
      if (!S || S.cards[S.i] !== c) return;
      if (freeze) Sfx.startTune();
      const ring = s.querySelector('#ring'), num = s.querySelector('#tnum'); const total = 10; const t0 = Date.now();
      await new Promise(res => { const iv = setInterval(() => {
        const el = (Date.now() - t0) / 1000; const left = Math.max(0, total - el); num.textContent = Math.ceil(left); ring.style.strokeDashoffset = (276 * (1 - left / total)).toFixed(1);
        if (freeze && el > 6 && Sfx.tune) { Sfx.stopTune(); num.textContent = '✋'; }
        if (left <= 0) { clearInterval(iv); res(); } }, 100); });
      if (!S || S.cards[S.i] !== c) return;
      Sfx.stopTune(); zouzou('clap', 'برافو!'); confetti(); Sfx.sparkle(); reveal(c, 'correct');
    })();
  }
  function playSilly(c, m) {
    const s = frame(c, pic(m.pics[0] || assetOf(c), ''), `<div class="yesno"><button class="btn-round yes" data-a="yes"><span class="face">😊</span>واه</button><button class="btn-round no" data-a="no"><span class="face">🙃</span>لا</button></div>`);
    let wrong = false, done = false;
    s.querySelectorAll('.btn-round').forEach(b => b.addEventListener('click', async () => {
      if (done) return;
      if (b.dataset.a === c.answer) { done = true; await correct(c, s.querySelector('.pic')); reveal(c, wrong ? 'wrong' : 'correct'); }
      else if (!wrong) { wrong = true; await tryAgain(c, null); }
      else { done = true; reveal(c, 'wrong'); }
    }));
    Voice.play(k(c, 'ask'), c.ask);
  }

  /* ---------- END OF SESSION: star, mission, goodbye ---------- */
  async function endSession() {
    const played = S.cards.slice(); const today = S.today; const now = new Date();
    const doneStages = () => DATA.levels.filter(l => { const st = E.stageStats(P, DATA.cards, l.stage); return E.isUnlocked(P, DATA.cards, l.stage) && st.known >= Math.ceil(st.total * (P.settings.unlockRatio || .8)); }).map(l => l.stage);
    const doneBefore = doneStages();
    played.forEach(c => E.recordAnswer(P, c.id, S.results[c.id] || 'correct', today, P.sessionCount));
    const stageJustDone = doneStages().some(st => !doneBefore.includes(st));   // she finished a whole stage this session
    const text = E.missionFor(played, rnd);
    const mc = played.find(c => c.mission === text); const di = E.DEFAULT_MISSIONS.indexOf(text);
    const mkey = mc ? `mission:${mc.id}` : `mission:default:${di}`;
    E.finishSession(P, played, today, now, text); P.today = today; Stickers.core.sync(P, STICKERS, P.settings.stickerPer || 1); save();
    const s = screen('end', `<div class="center"><img class="bigstar-img" src="img/zouzou3d/star.webp" alt=""><h2 class="h">نجمة جديدة في دفتر النجوم!</h2><div class="stars-row"><img class="star-img" src="img/zouzou3d/star.webp" alt=""><span>${P.stars}</span></div><div class="mascot-slot" data-size="220"></div></div>`);
    setMascot(s.querySelector('.mascot-slot'), 'clap'); confetti(30); Sfx.sparkle();
    await Voice.play('ui:4', 'خذيتي نجمة!'); await wait(1500);
    if (!$app.querySelector('.end')) return;
    await new Promise(res => Book.awardAll(res));
    await new Promise(res => Toy.play(res));                                     // pop-it time!
    const m = screen('end mission', `<div class="center"><div class="mascot-slot" data-size="220"></div><div class="bubble big">${text}</div><button class="btn-big green" id="ok">تم ✓</button></div>`);
    setMascot(m.querySelector('.mascot-slot'), 'wave');
    await Voice.play(mkey, text);
    await new Promise(res => { m.querySelector('#ok').onclick = res; });
    if (stageJustDone) {                                                        // whole stage finished: Zouzou's big bravo, then off to the toys
      const b = screen('end stage-done', `<div class="center"><div class="mascot-slot" data-size="240"></div><div class="bubble big">${DATA.feedback_lines.stage_done}</div><button class="btn-big green" id="ok">تم ✓</button></div>`);
      setMascot(b.querySelector('.mascot-slot'), 'clap'); confetti(50); Sfx.fanfare();
      await Voice.play('fb:stage_done', DATA.feedback_lines.stage_done);
      await new Promise(res => { b.querySelector('#ok').onclick = res; setTimeout(res, 10000); });
    } else await Voice.play('fb:session_end', DATA.feedback_lines.session_end);
    S = null; renderHome();
  }

  /* ---------- PARENT AREA ---------- */
  function openParent() {
    Voice.stop();
    const st = P.settings;
    const stageRows = DATA.levels.map(l => { const s = E.stageStats(P, DATA.cards, l.stage); const un = E.isUnlocked(P, DATA.cards, l.stage);
      return `<tr><td>${l.stage}. ${l.name}</td><td>${un ? '' : '🔒 '}${s.known} / ${s.total}</td><td>${s.seen} شوفت</td></tr>`; }).join('');
    const known = DATA.cards.filter(c => E.isKnown(P, c.id)).map(c => c.word);
    const next = DATA.levels.find(l => !E.isUnlocked(P, DATA.cards, l.stage));
    const o = h(`<div class="overlay"><div class="panel parent" dir="rtl">
      <div class="prow"><h2>منطقة الوالدين</h2><button class="btn-adult" id="close">رجوع ✕</button></div>
      <div class="ptabs"><button data-t="prog" class="on">التقدم</button><button data-t="set">الإعدادات</button><button data-t="data">نسخة احتياطية</button><button data-t="cred">المصادر</button></div>
      <div class="ptab" data-t="prog">
        <table class="ptable">${stageRows}</table>
        <p>${(() => { const k = E.streak(P, E.dateKey()); const n = E.daysSince(P.startDate, E.dateKey()); return `<b>نستعمل التطبيق منذ</b> ${P.startDate || '—'} · <b>اليوم</b> ${n} 🔥 · <b>أيام لعب مسجلة:</b> ${k.days} · <b>متتالية الآن:</b> ${k.current} · <b>أطول متتالية:</b> ${k.best}`; })()}</p>
        <p><b>الحصص:</b> ${P.sessionCount} · <b>النجوم:</b> ${P.stars} · <b>المُلصقات:</b> ${((P.stickers || {}).got || []).length} / ${STICKERS.length} · <b>اليوم:</b> ${E.sessionsOn(P, E.dateKey())} / ${st.sessionsPerDay}</p>
        <p><b>الكلمات المعروفة (${known.length}):</b> ${known.join('، ') || '—'}</p>
        <p><b>دفتر النجوم:</b> ${P.starBook.map(s => '★').join('') || '—'}</p>
      </div>
      <div class="ptab hidden" data-t="set">
        <label>حصص في اليوم <input type="number" min="1" max="6" id="spd" value="${st.sessionsPerDay}"></label>
        <label>بطاقات في الحصة <input type="number" min="3" max="15" id="cps" value="${st.cardsPerSession}"></label>
        <label>نوم زوزو بين الحصتين (دقائق؛ 240 = حصة الصباح وحصة العشية) <input type="number" min="0" max="600" id="brk" value="${st.breakMinutes}"></label>
        <label>حصص لكل مُلصق (1 = مُلصق بعد كل حصة) <input type="number" min="1" max="5" id="stper" value="${st.stickerPer || 1}"></label>
        <label>تاريخ بداية استعمال التطبيق <input type="date" id="startdate" value="${P.startDate || ''}"></label>
        <label><input type="checkbox" id="hints" ${st.hints ? 'checked' : ''}> إظهار تلميحات الكبار تحت البطاقة</label>
        <p><button class="btn-adult" id="unlock" ${next ? '' : 'disabled'}>فتح المرحلة ${next ? next.stage : ''} يدوياً</button></p>
        <p><select id="resetcard"><option value="">— إعادة بطاقة واحدة —</option>${DATA.cards.filter(c => P.cards[c.id]).map(c => `<option value="${c.id}">${c.id} ${c.word}</option>`).join('')}</select> <button class="btn-adult" id="resetone">إعادة</button></p>
        <p><button class="btn-adult danger" id="resetall">مسح كل التقدم</button></p>
      </div>
      <div class="ptab hidden" data-t="data">
        <p><b>كود التقدم</b> — انسخيه من الجهاز (أو من سفاري) الذي فيه التقدم الصحيح، والصقيه هنا في التطبيق الآخر. على الآيباد، التطبيق على الشاشة الرئيسية وسفاري لهما حفظ منفصل.</p>
        <p><button class="btn-adult" id="copycode">نسخ كود التقدم (${P.stars} نجوم)</button></p>
        <textarea id="code" rows="3" readonly placeholder="الكود يظهر هنا بعد الضغط على الزر"></textarea>
        <p><textarea id="paste" rows="3" placeholder="الصقي كود التقدم هنا"></textarea> <button class="btn-adult" id="applycode">استرجاع من الكود</button></p>
        <p><button class="btn-adult" id="export">تصدير التقدم (JSON)</button> <label class="btn-adult">استيراد <input type="file" id="import" accept="application/json" hidden></label></p>
        <textarea id="json" rows="6" readonly></textarea>
      </div>
      <div class="ptab hidden" data-t="cred"><div id="credits">…</div></div>
    </div></div>`);
    $app.firstElementChild.appendChild(o);
    o.querySelector('#close').onclick = () => { o.remove(); renderHome(); };
    o.querySelectorAll('.ptabs button').forEach(b => b.onclick = () => { o.querySelectorAll('.ptabs button').forEach(x => x.classList.toggle('on', x === b)); o.querySelectorAll('.ptab').forEach(t => t.classList.toggle('hidden', t.dataset.t !== b.dataset.t)); });
    const setNum = (id, key, lo, hi) => o.querySelector(id).onchange = (e) => { const v = Math.max(lo, Math.min(hi, +e.target.value || lo)); P.settings[key] = v; e.target.value = v; save(); };
    setNum('#spd', 'sessionsPerDay', 1, 6); setNum('#stper', 'stickerPer', 1, 5); setNum('#cps', 'cardsPerSession', 3, 15); setNum('#brk', 'breakMinutes', 0, 600);
    o.querySelector('#hints').onchange = (e) => { P.settings.hints = e.target.checked; save(); };
    o.querySelector('#startdate').onchange = (e) => { if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) { P.startDate = e.target.value; save(); } };
    if (next) o.querySelector('#unlock').onclick = () => { P.manualUnlocked.push(next.stage); save(); o.remove(); openParent(); };
    o.querySelector('#resetone').onclick = () => { const id = o.querySelector('#resetcard').value; if (id) { delete P.cards[id]; save(); o.remove(); openParent(); } };
    o.querySelector('#resetall').onclick = () => { if (confirm('مسح كل تقدم زينب؟ لا يمكن التراجع.')) { P = E.emptyProgress(); save(); o.remove(); renderHome(); } };
    o.querySelector('#copycode').onclick = async () => { const tok = await makeRestoreCode(); const ta = o.querySelector('#code'); ta.value = tok; ta.select(); try { await navigator.clipboard.writeText(tok); o.querySelector('#copycode').textContent = 'تم النسخ ✓'; } catch (e) { o.querySelector('#copycode').textContent = 'حددي الكود وانسخيه'; } };
    o.querySelector('#applycode').onclick = async () => { const tok = o.querySelector('#paste').value; if (!tok.trim()) return; if (await applyRestoreCode(tok, false)) { o.remove(); renderHome(); } };
    o.querySelector('#export').onclick = () => { const txt = JSON.stringify(P); o.querySelector('#json').value = txt; const b = new Blob([txt], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `zaineb-progress-${E.dateKey()}.json`; a.click(); };
    o.querySelector('#import').onchange = async (e) => { const f = e.target.files[0]; if (!f) return; try { const p = JSON.parse(await f.text()); if (!p.cards) throw 0; if (confirm('استبدال التقدم الحالي بالملف؟')) { P = Object.assign(E.emptyProgress(), p); P.settings = Object.assign({}, E.DEFAULT_SETTINGS, P.settings || {}); save(); o.remove(); renderHome(); } } catch (err) { alert('ملف غير صالح'); } };
    fetch('credits.json').then(r => r.json()).then(cr => {
      o.querySelector('#credits').innerHTML = `<p>${cr.illustrations}</p><p>الملصقات: Microsoft Fluent Emoji 3D (MIT) مع إطار وأوجه مضافة، والجيلي اللامع مرسوم خصيصاً للتطبيق. الأصوات مصنوعة داخل التطبيق.</p><table class="ptable" dir="ltr">${cr.photos.map(p => `<tr><td><img src="img/${p.asset}.webp" width="40"></td><td>${p.title || p.asset}</td><td>${p.creator || ''}</td><td><a href="${p.license_url}" target="_blank">${p.license}</a></td><td>${p.link ? `<a href="${p.link}" target="_blank">${p.source}</a>` : p.source} · ${p.via}</td></tr>`).join('')}</table>`;
    }).catch(() => {});
  }

  /* ---------- restore progress from a link (#restore=...) made on another device ---------- */
  async function maybeRestoreFromLink() {
    const m = location.hash.match(/#restore=([A-Za-z0-9_-]+)/); if (!m) return;
    history.replaceState(null, '', location.pathname);
    let used = ''; try { used = localStorage.getItem(KEY + ':restored') || ''; } catch (e) {}
    if (used === m[1].slice(-40)) return;                                       // this code was already applied here: ignore it
    await applyRestoreCode(m[1], true);
  }
  async function decodeRestoreCode(tok) {
    const b64 = tok.trim().replace(/^.*#restore=/, '').replace(/-/g, '+').replace(/_/g, '/'); const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const ds = new DecompressionStream('deflate'); const w = ds.writable.getWriter(); w.write(bin); w.close();
    const p = JSON.parse(await new Response(ds.readable).text()); if (!p.cards) throw 0; return p;
  }
  async function makeRestoreCode() {
    const cs = new CompressionStream('deflate'); const w = cs.writable.getWriter(); w.write(new TextEncoder().encode(JSON.stringify(P))); w.close();
    const buf = new Uint8Array(await new Response(cs.readable).arrayBuffer()); let s = ''; buf.forEach(b => { s += String.fromCharCode(b); });
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  async function applyRestoreCode(tok, fromLink) {
    try {
      const p = await decodeRestoreCode(tok); const mine = P.sessionCount || 0;
      if (mine > 0 && !confirm(`استرجاع التقدم من الجهاز الآخر (${p.stars} نجوم، ${p.sessionCount} حصص)؟ سيستبدل التقدم الموجود هنا (${P.stars} نجوم).`)) return false;
      P = Object.assign(E.emptyProgress(), p); P.settings = Object.assign({}, E.DEFAULT_SETTINGS, P.settings || {}); if (STICKERS) Stickers.core.sync(P, STICKERS, P.settings.stickerPer || 1).forEach(e => { e.seen = true; }); save();
      try { localStorage.setItem(KEY + ':restored', tok.trim().replace(/^.*#restore=/, '').slice(-40)); } catch (e) {}
      alert(`تم! ${P.stars} نجوم و ${P.sessionCount} حصص رجعت لزينب.`); return true;
    } catch (e) { alert(fromLink ? 'الرابط ما خدمش. جربي مرة أخرى.' : 'الكود ما خدمش. تأكدي أنك لصقتي الكود كامل.'); return false; }
  }

  /* ---------- boot ---------- */
  async function boot() {
    let stk; [DATA, MEDIA, stk, CLOUDS, POPIT] = await Promise.all([fetch('zaineb_cards.json').then(r => r.json()), fetch('media.json').then(r => r.json()), fetch('stickers/stickers.json').then(r => r.json()), fetch('img/popit/layout.json').then(r => r.json()).catch(() => ({})), fetch('img/zouzou3d/clouds.json').then(r => r.json()).catch(() => ({}))]);
    STICKERS = stk.stickers;
    P = load();
    await Voice.init();
    await maybeRestoreFromLink();
    Toy = Popit.mount({ $app, h, screen, Mascot: M, Voice, Sfx, confetti, layout: POPIT, pick: () => P.sessionCount });
    Book = Stickers.mount({ $app, h, screen, Mascot: M, Voice, Sfx, confetti, getP: () => P, save, settings: () => P.settings, catalog: STICKERS, goHome: renderHome });
    Stickers.core.sync(P, STICKERS, P.settings.stickerPer || 1).forEach(e => { e.seen = true; }); save();   // stickers earned before this version go straight into the book, no award flood
    renderHome();
    const dev = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && !location.search.includes('sw=1');
    if ('serviceWorker' in navigator && location.protocol !== 'file:' && !dev) {
      let had = !!navigator.serviceWorker.controller;
      navigator.serviceWorker.addEventListener('controllerchange', () => { if (had && !window.__reloaded) { window.__reloaded = true; if (S) window.__pendingReload = true; else location.reload(); } had = true; });   // a new version took over: load it
      navigator.serviceWorker.register('sw.js').then(reg => { reg.update().catch(() => {}); }).catch(() => {});
    }
    window.ZP = { get Book() { return Book; }, get stickers() { return STICKERS; }, openParent, playCard(id) { const c = DATA.cards.find(x => x.id === id); S = { cards: [c], i: 0, results: {}, today: E.dateKey(), choices: 3 }; showCard(); }, data: DATA, media: MEDIA, get p() { return P; }, set p(v) { P = v; save(); }, save, Engine: E, renderHome, Voice, startSession, get session() { return S; } };
  }
  boot();
})();
