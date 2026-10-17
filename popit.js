/* بوب إت — a pop-it toy Zaineb gets to play after she wins a session. */
(function (root) {
  const COLORS = ['#FF6B8A', '#FFA94D', '#FFD93D', '#6BCB77', '#4D96FF'];
  const COLS = 6;
  function mount(api) {
    const { $app, h, screen, Mascot, Voice, Sfx, confetti } = api;
    const setMascot = (el, s, size) => { el.innerHTML = Mascot.svg(s, { size: size || 130 }); };
    function play(done) {
      const cells = [];
      COLORS.forEach((c, r) => { for (let i = 0; i < COLS; i++) cells.push(`<button class="pb" style="--c:${c}" aria-label="فقاعة"></button>`); });
      const s = screen('popit', `
        <div class="topbar"><div class="btitle">بوب إت! 🫧</div><button class="btn-big green sm" id="done">خلاص ✓</button></div>
        <div class="popit-wrap"><div class="popgrid" id="grid">${cells.join('')}</div></div>
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
    return { play };
  }
  const Popit = { mount };
  if (typeof module !== 'undefined' && module.exports) module.exports = Popit; else root.Popit = Popit;
})(typeof window !== 'undefined' ? window : globalThis);
