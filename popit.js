/* بوب إت — a pop-it toy Zaineb gets to play after she wins a session.
   Boards and bubbles are her ChatGPT 3D pictures (img/popit); img/popit/layout.json says where bubbles fit in each shape. */
(function (root) {
  const COLORS = ['pink', 'orange', 'yellow', 'green', 'blue'];
  const BOARDS = ['rectangle', 'heart', 'star', 'circle', 'cloud', 'flower', 'butterfly'];
  function mount(api) {
    const { $app, h, screen, Mascot, Voice, Sfx, confetti, layout, pick } = api;
    const setMascot = (el, s, size) => { el.innerHTML = Mascot.svg(s, { size: size || 130 }); };
    COLORS.forEach(c => ['bubble', 'pressed'].forEach(k => { const im = new Image(); im.src = `img/popit/${k}-${c}.webp`; }));   // no flicker on the first pop
    function play(done) {
      const name = BOARDS[Math.abs(pick ? pick() : 0) % BOARDS.length]; const L = (layout || {})[name];
      if (!L) return done();
      const rows = []; L.pts.forEach(p => { if (!rows.some(y => Math.abs(y - p[1]) < 1)) rows.push(p[1]); }); rows.sort((a, b) => a - b);
      const cells = L.pts.map(p => { const c = COLORS[rows.findIndex(y => Math.abs(y - p[1]) < 1) % COLORS.length];
        return `<button class="pb" style="left:${p[0]}%;top:${p[1]}%;width:${L.r * 2}%;--up:url(img/popit/bubble-${c}.webp);--down:url(img/popit/pressed-${c}.webp)" aria-label="فقاعة"></button>`; });
      const s = screen('popit', `
        <div class="topbar"><div class="btitle">بوب إت! 🫧</div><button class="btn-big green sm" id="done">خلاص ✓</button></div>
        <div class="popit-wrap"><div class="popboard" style="--ratio:${L.ratio}"><img class="board" src="img/popit/board-${name}.webp" alt="" draggable="false">${cells.join('')}</div></div>
        <button class="btn-big sm hidden" id="again">مرة أخرى 🔄</button>
        <div class="zouzou top"><div class="zbubble">نلعبو بوب إت!</div><div class="mascot-slot"></div></div>`, 'day');
      const z = s.querySelector('.zouzou .mascot-slot'); const bub = s.querySelector('.zbubble'); setMascot(z, 'wave');
      Voice.play('ui:0', 'أهلاً زينب! نلعبو؟'); setTimeout(() => { bub.hidden = true; setMascot(z, 'idle'); }, 3500);
      let left = cells.length, n = 0;
      const cheer = (text, state) => { bub.textContent = text; bub.hidden = false; setMascot(z, state || 'clap'); clearTimeout(cheer.t); cheer.t = setTimeout(() => { bub.hidden = true; setMascot(z, 'idle'); }, 2500); };
      s.querySelectorAll('.pb').forEach(b => b.addEventListener('pointerdown', (e) => {
        e.preventDefault(); if (b.classList.contains('popped')) return;
        b.classList.add('popped'); Sfx.popit(n++); left--;
        if (n % 8 === 0 && left) cheer(['يا سلام!', 'هههه!', 'واو!'][(n / 8) % 3 | 0], 'happy');
        if (!left) { Sfx.fanfare(); confetti(50); cheer('برافو! خلصناهم كامل!', 'clap'); Voice.play('st:giggle', 'هههه!'); s.querySelector('#again').classList.remove('hidden'); }
      }));
      s.querySelector('#again').onclick = () => { s.querySelectorAll('.pb').forEach((b, i) => setTimeout(() => b.classList.remove('popped'), i * 25)); Sfx.pageTurn(); left = cells.length; s.querySelector('#again').classList.add('hidden'); };
      s.querySelector('#done').onclick = () => { Voice.stop(); done(); };
    }
    return { play, BOARDS };
  }
  const Popit = { mount };
  if (typeof module !== 'undefined' && module.exports) module.exports = Popit; else root.Popit = Popit;
})(typeof window !== 'undefined' ? window : globalThis);
