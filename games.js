/* Extra games for زينب تلعب وتتعلم: a memory-match break in the middle of a session (known words' pictures)
   and a balloon-pop toy that takes turns with the pop-it after a win. No new text: the voice only says known words. */
(function (root) {
  function mount(api) {
    const { $app, h, screen, Mascot, Voice, Sfx, confetti, media } = api;
    const setMascot = (el, s, size) => { el.innerHTML = Mascot.svg(s, { size: size || 130 }); };
    const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

    /* ---------- memory match: 3 pairs of pictures, face down ---------- */
    function memory(cards, done) {
      const picks = shuffle(cards.filter(c => media(c))).slice(0, 3);
      if (picks.length < 2) return done();
      const deck = shuffle(picks.concat(picks).map((c, i) => ({ c, key: i })));
      const s = screen('memory', `
        <div class="topbar"><div class="btitle">لعبة الذاكرة 🃏</div><button class="btn-big green sm" id="skip">تخطي</button></div>
        <div class="mem-wrap"><div class="mem-grid">${deck.map((d, i) => `<button class="mem" data-i="${i}" data-id="${d.c.id}" aria-label="بطاقة"><div class="mem-in"><div class="mem-back"><img src="img/zouzou3d/star.webp" alt=""></div><div class="mem-front"><img src="img/${media(d.c)}" alt="${d.c.word}" draggable="false"></div></div></button>`).join('')}</div></div>
        <div class="zouzou top"><div class="zbubble">بدلنا اللعبة! وين الزوج؟</div><div class="mascot-slot"></div></div>`, 'day');
      const z = s.querySelector('.zouzou .mascot-slot'); const bub = s.querySelector('.zbubble'); setMascot(z, 'wave');
      Voice.play('ui:3', 'بدلنا اللعبة!'); setTimeout(() => { bub.hidden = true; setMascot(z, 'idle'); }, 3500);
      const cheer = (text, state) => { bub.textContent = text; bub.hidden = false; setMascot(z, state || 'clap'); clearTimeout(cheer.t); cheer.t = setTimeout(() => { bub.hidden = true; setMascot(z, 'idle'); }, 2500); };
      let open = [], lock = false, left = picks.length;
      s.querySelectorAll('.mem').forEach(b => b.addEventListener('click', () => {
        if (lock || b.classList.contains('up') || b.classList.contains('done')) return;
        b.classList.add('up'); Sfx.pop(); open.push(b);
        if (open.length < 2) return;
        lock = true; const [a, c] = open; open = [];
        if (a.dataset.id === c.dataset.id) {
          const card = picks.find(x => x.id === a.dataset.id);
          setTimeout(() => { a.classList.add('done'); c.classList.add('done'); Sfx.sparkle(); cheer(card.word, 'clap'); Voice.play(`c:${card.id}:word`, card.word); lock = false; left--;
            if (!left) { Sfx.fanfare(); confetti(50); cheer('برافو! لقيتي كامل الأزواج!', 'clap'); setTimeout(done, 2600); } }, 350);
        } else setTimeout(() => { a.classList.remove('up'); c.classList.remove('up'); Sfx.hmm(); lock = false; }, 950);
      }));
      s.querySelector('#skip').onclick = () => { Voice.stop(); done(); };
    }

    /* ---------- balloons: they float up, she pops them ---------- */
    const COLORS = ['#FF6B8A', '#FFA94D', '#FFD93D', '#6BCB77', '#4D96FF', '#C58BFF'];
    function balloons(done) {
      const s = screen('balloons', `
        <div class="topbar"><div class="btitle">البالونات 🎈</div><button class="btn-big green sm" id="done">خلاص ✓</button></div>
        <div class="sky-area" id="sky"></div>
        <div class="zouzou top"><div class="zbubble">فقّعي البالونات!</div><div class="mascot-slot"></div></div>`, 'day');
      const z = s.querySelector('.zouzou .mascot-slot'); const bub = s.querySelector('.zbubble'); setMascot(z, 'wave');
      Voice.play('ui:0', 'أهلاً زينب! نلعبو؟'); setTimeout(() => { bub.hidden = true; setMascot(z, 'idle'); }, 3000);
      const sky = s.querySelector('#sky'); let n = 0, alive = true;
      const cheer = (text, state) => { bub.textContent = text; bub.hidden = false; setMascot(z, state || 'clap'); clearTimeout(cheer.t); cheer.t = setTimeout(() => { bub.hidden = true; setMascot(z, 'idle'); }, 2000); };
      function spawn() {
        if (!alive || !$app.contains(sky)) return;
        const b = h(`<button class="balloon" aria-label="بالون" style="left:${6 + Math.random() * 82}%;--c:${COLORS[n % COLORS.length]};--d:${9 + Math.random() * 6}s;--sz:${110 + Math.random() * 60}px"><span class="knot"></span><span class="string"></span></button>`);
        b.addEventListener('pointerdown', (e) => { e.preventDefault(); if (b.classList.contains('popped')) return; b.classList.add('popped'); Sfx.popit(n); n++;
          const r = b.getBoundingClientRect(); api.burst && api.burst(s, r.left + r.width / 2, r.top + r.height / 2);
          if (n % 6 === 0) cheer(['يا سلام!', 'هههه!', 'واو!'][(n / 6) % 3 | 0], 'happy'); setTimeout(() => b.remove(), 400); });
        b.addEventListener('animationend', () => b.remove());
        sky.appendChild(b); setTimeout(spawn, 700 + Math.random() * 900);
      }
      spawn(); setTimeout(spawn, 300); setTimeout(spawn, 600);
      s.querySelector('#done').onclick = () => { alive = false; Voice.stop(); done(); };
    }
    return { memory, balloons };
  }
  const Games = { mount };
  if (typeof module !== 'undefined' && module.exports) module.exports = Games; else root.Games = Games;
})(typeof window !== 'undefined' ? window : globalThis);
