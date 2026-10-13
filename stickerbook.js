/* دفتر الملصقات — sticker book for زينب تلعب وتتعلم.
   Core (pure, Node-testable): earned, sync, pageOf.  Screens: mount(api). */
(function (root) {
  const PER_PAGE = 4;

  /* how many stickers a child with `sessions` finished sessions has earned, one per `per` sessions */
  function earned(sessions, per) { per = Math.max(1, per || 1); return Math.floor((sessions || 0) / per); }

  /* bring progress.stickers up to date: stickers are only ever added, never removed. Returns the new (unseen) entries. */
  function sync(p, catalog, per) {
    p.stickers = p.stickers || { got: [] };
    const want = Math.min(earned(p.sessionCount, per), catalog.length);
    const fresh = [];
    while (p.stickers.got.length < want) {
      const i = p.stickers.got.length; const e = { i, file: catalog[i].file, seen: false, date: p.today || null }; p.stickers.got.push(e); fresh.push(e);
    }
    return fresh;
  }
  function unseen(p) { return ((p.stickers && p.stickers.got) || []).filter(e => !e.seen); }
  function pageOf(i) { return Math.floor(i / PER_PAGE); }
  function pageCount(catalogLen) { return Math.ceil(catalogLen / PER_PAGE); }

  const core = { PER_PAGE, earned, sync, unseen, pageOf, pageCount };

  /* ---------- screens ---------- */
  function mount(api) {
    const { $app, h, screen, Mascot, Voice, Sfx, confetti, getP, save, settings, catalog, goHome } = api;
    const setMascot = (el, s, size) => { el.innerHTML = Mascot.svg(s, { size: size || 170 }); };
    const cls = (c) => c.kind === 'glitter' ? 'glitter' : c.kind === 'food' ? 'food' : c.kind === 'sparkly' ? 'sparkly' : 'animal';
    const img = (c) => `<img src="stickers/${c.file}" alt="${c.name}" draggable="false">`;
    const countKey = (n) => `st:count:${Math.min(n, 40)}`;
    const countText = (n) => n === 1 ? 'عندك ملصق واحد!' : n === 2 ? 'عندك زوج ملصقات!' : n <= 10 ? `عندك ${n} ملصقات!` : `عندك ${n} ملصق!`;
    let page = 0, busy = false;

    /* --- award: "زينب ربحتي ملصق!" --- */
    const GIFT = `<svg class="gift-svg" viewBox="0 0 400 400"><defs>
      <linearGradient id="gbox" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF9F86"/><stop offset=".55" stop-color="#FF6F57"/><stop offset="1" stop-color="#D9452F"/></linearGradient>
      <linearGradient id="glid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFB29E"/><stop offset="1" stop-color="#F0614A"/></linearGradient>
      <linearGradient id="grib" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFE98A"/><stop offset=".5" stop-color="#FFC83D"/><stop offset="1" stop-color="#E8A300"/></linearGradient>
      <radialGradient id="gshine" cx="30%" cy="20%" r="70%"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
      <ellipse cx="200" cy="380" rx="150" ry="18" fill="#2a4a66" opacity=".18"/>
      <g class="gift-lid"><rect x="56" y="118" width="288" height="74" rx="20" fill="url(#glid)" stroke="#8a2f1f" stroke-width="5"/><rect x="176" y="118" width="48" height="74" fill="url(#grib)" stroke="#9a6a00" stroke-width="4"/>
      <path d="M200 120 C148 58 104 70 128 106 C150 134 190 122 200 120 Z" fill="url(#grib)" stroke="#9a6a00" stroke-width="5" stroke-linejoin="round"/><path d="M200 120 C252 58 296 70 272 106 C250 134 210 122 200 120 Z" fill="url(#grib)" stroke="#9a6a00" stroke-width="5" stroke-linejoin="round"/>
      <circle cx="200" cy="120" r="14" fill="#FFE98A" stroke="#9a6a00" stroke-width="4"/><rect x="56" y="118" width="288" height="74" rx="20" fill="url(#gshine)"/></g>
      <g class="gift-box"><rect x="78" y="186" width="244" height="190" rx="24" fill="url(#gbox)" stroke="#8a2f1f" stroke-width="5"/><rect x="176" y="186" width="48" height="190" fill="url(#grib)" stroke="#9a6a00" stroke-width="4"/>
      <rect x="78" y="186" width="244" height="190" rx="24" fill="url(#gshine)"/><circle cx="130" cy="262" r="14" fill="#fff" opacity=".45"/><circle cx="292" cy="330" r="9" fill="#fff" opacity=".4"/></g></svg>`;
    async function award(entry, done) {
      const P = getP(); const c = catalog[entry.i]; const n = entry.i + 1;
      const s = screen('end sticker-award', `<div class="center"><h2 class="h">زينب ربحتي ملصق!</h2>
        <div class="gift-stage"><div class="rays"></div><div class="gift wobble" id="gift">${GIFT}</div><div class="big-sticker ${cls(c)} hidden">${img(c)}</div></div>
        <div class="count" id="count">افتحي الهدية!</div><button class="btn-big green hidden" id="stick">نلصقوه في الدفتر ✓</button></div>
        <div class="zouzou"><div class="zbubble">زينب ربحتي ملصق!</div><div class="mascot-slot"></div></div><div class="burst" id="burst"></div>`);
      setMascot(s.querySelector('.zouzou .mascot-slot'), 'clap', 190); Sfx.sparkle();
      Voice.play('st:win', 'زينب ربحتي ملصق!');
      // the gift opens on a tap, or by itself after a few seconds
      await new Promise(res => { s.querySelector('#gift').onclick = res; setTimeout(res, 4500); });
      const gift = s.querySelector('#gift'); gift.classList.remove('wobble'); gift.classList.add('open'); s.querySelector('.rays').classList.add('on');
      Sfx.stickerSound('sparkly'); confetti(40); burst(s.querySelector('#burst'), 'sparkly');
      await new Promise(r => setTimeout(r, 500));
      const big = s.querySelector('.big-sticker'); big.classList.remove('hidden'); big.classList.add('rise'); Sfx.stickerSound(cls(c));
      await new Promise(r => setTimeout(r, 1100));
      gift.classList.add('gone');
      s.querySelector('#count').textContent = countText(n); s.querySelector('.zbubble').textContent = countText(n); s.querySelector('#stick').classList.remove('hidden');
      await Voice.play(countKey(n), countText(n));
      await new Promise(res => { s.querySelector('#stick').onclick = res; setTimeout(res, 12000); });
      entry.seen = true; save();
      big.classList.add('fly'); Sfx.pop(); Voice.play('st:stick', 'نلصقوه في الدفتر!');
      await new Promise(res => setTimeout(res, 900));
      done();
    }
    /* award every unseen sticker in turn, then call done */
    function awardAll(done) {
      const list = unseen(getP()); let k = 0;
      const next = () => { if (k >= list.length) return done(); award(list[k++], next); };
      next();
    }

    /* --- the book --- */
    function book() {
      const P = getP(); const got = (P.stickers && P.stickers.got) || []; const pages = pageCount(catalog.length);
      if (page >= pages) page = pages - 1; if (page < 0) page = 0;
      const slots = [];
      for (let i = page * PER_PAGE; i < (page + 1) * PER_PAGE; i++) {
        const c = catalog[i]; const have = i < got.length;
        slots.push(!c ? '<div class="slot none"></div>' : have ? `<div class="slot got ${cls(c)}" data-i="${i}">${img(c)}</div>` : '<div class="slot empty"><div class="q">؟</div></div>');
      }
      const s = screen('book', `
        <div class="topbar"><button class="btn-home" id="home">⌂</button><div class="btitle">دفتر الملصقات</div><div class="stars-row"><span class="sticker-ico">✿</span><span>${got.length}</span></div></div>
        <div class="bookarea"><button class="arrow" id="prev" ${page <= 0 ? 'disabled' : ''}>❯</button><div class="grid2" id="grid">${slots.join('')}</div><button class="arrow" id="next" ${page >= pages - 1 ? 'disabled' : ''}>❮</button></div>
        <div class="pager">صفحة ${page + 1} من ${pages}</div>
        <div class="zouzou"><div class="zbubble" hidden></div><div class="mascot-slot"></div></div><div class="burst" id="burst"></div>`);
      const z = s.querySelector('.zouzou .mascot-slot'); setMascot(z, 'idle');
      s.querySelector('#home').onclick = () => { Voice.stop(); goHome(); };
      // RTL: the right-hand arrow goes back, the left-hand arrow goes forward
      const turn = (d) => { const np = page + d; if (np < 0 || np >= pages) return; page = np; Sfx.pageTurn(); book(); };
      s.querySelector('#next').onclick = () => turn(1); s.querySelector('#prev').onclick = () => turn(-1);
      let x0 = null; s.addEventListener('pointerdown', e => { x0 = e.clientX; }); s.addEventListener('pointerup', e => { if (x0 === null) return; const dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 70) turn(dx > 0 ? 1 : -1); });
      s.querySelectorAll('.slot.got').forEach(slot => slot.addEventListener('click', () => play(slot, s)));
      if (!book.greeted) { book.greeted = true; Voice.play('st:book', 'هذا دفتر الملصقات تاعك!'); const b = s.querySelector('.zbubble'); b.textContent = 'هذا دفتر الملصقات تاعك!'; b.hidden = false; setTimeout(() => { b.hidden = true; }, 3500); }
    }

    /* --- tapping a sticker: it grows almost full-screen, wobbles or spins by kind, bursts, Zouzou cheers --- */
    function play(slot, s) {
      if (busy) return; busy = true;
      const c = catalog[+slot.dataset.i]; const kind = cls(c);
      const ghost = h(`<div class="slot alive ${kind}">${img(c)}</div>`); $app.appendChild(ghost);
      Sfx.stickerSound(kind);
      setTimeout(() => burst(s.querySelector('#burst'), kind), 300);
      const z = s.querySelector('.zouzou .mascot-slot'); const b = s.querySelector('.zbubble');
      const line = play.n++ % 2 ? ['st:giggle', 'هههه!'] : ['st:look', 'واو! شوفي الملصق!'];
      setMascot(z, 'clap'); b.textContent = line[1]; b.hidden = false; Voice.play(line[0], line[1]);
      setTimeout(() => { ghost.classList.add('back'); }, 2100);
      setTimeout(() => { ghost.remove(); setMascot(z, 'idle'); b.hidden = true; busy = false; }, 2700);
    }
    play.n = 0;
    function burst(el, kind) {
      const chars = kind === 'glitter' ? ['✦', '♥', '✧', '●'] : kind === 'food' ? ['♥', '●', '★', '✦'] : kind === 'sparkly' ? ['★', '✦', '✧', '★'] : ['★', '♥', '✦', '●'];
      const colors = ['#F5B820', '#FF8A71', '#FF8FA3', '#6FA8DC', '#5FAE52', '#C58BFF'];
      for (let i = 0; i < 48; i++) {
        const sp = document.createElement('span'); sp.textContent = chars[i % chars.length];
        const a = Math.random() * 6.283, r = 300 + Math.random() * 380;
        sp.style.setProperty('--dx', Math.cos(a) * r + 'px'); sp.style.setProperty('--dy', Math.sin(a) * r + 'px');
        sp.style.color = colors[i % colors.length]; sp.style.fontSize = (44 + Math.random() * 40) + 'px'; sp.style.animationDelay = (Math.random() * .35) + 's';
        el.appendChild(sp); setTimeout(() => sp.remove(), 2300);
      }
    }

    return { book, awardAll, openPage(i) { page = pageOf(i); book(); } };
  }

  const Stickers = { core, mount };
  if (typeof module !== 'undefined' && module.exports) module.exports = Stickers; else root.Stickers = Stickers;
})(typeof window !== 'undefined' ? window : globalThis);
