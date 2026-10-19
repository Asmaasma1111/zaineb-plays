/* Pure game logic: Leitner boxes, session building, stage unlocking, daily caps.
   No DOM. Works in the browser (window.Engine) and in Node (module.exports) for tests. */
(function (root) {
  const BOX_DAYS = { 1: 0, 2: 1, 3: 3, 4: 7, 5: 14 };   // box -> days until due
  const KNOWN_BOX = 3;
  const DEFAULT_SETTINGS = { v: 4, sessionsPerDay: 2, cardsPerSession: 10, breakMinutes: 240, hints: true, unlockRatio: 0.6, bigPickAfter: 5 };
  const DEFAULT_MISSIONS = ['جيبيلي حاجة صفراء!', 'جيبيلي حاجة حمراء!', 'وريني حاجة مدوّرة!', 'نقزي ثلاث مرات!', 'روحي اعطي حضن لماما!'];

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dateKey(d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function addDays(key, n) { const [y, m, d] = key.split('-').map(Number); const dt = new Date(y, m - 1, d + n); return dateKey(dt); }

  function emptyProgress() {
    return { v: 1, cards: {}, sessions: [], stars: 0, manualUnlocked: [], sessionCount: 0, settings: Object.assign({}, DEFAULT_SETTINGS), starBook: [] };
  }

  /* ---------- Leitner ---------- */
  function cardState(p, id) { return p.cards[id] || null; }
  function isKnown(p, id) { const s = cardState(p, id); return !!s && s.box >= KNOWN_BOX; }
  function isDue(p, id, today, sessionIndex) {
    const s = cardState(p, id); if (!s) return false;
    if (s.box === 1) return s.dueSession <= sessionIndex;           // box 1 = next session
    return s.due <= today;
  }
  /* record an answer. result: 'correct' | 'wrong' | 'help' */
  function recordAnswer(p, id, result, today, sessionIndex) {
    const s = p.cards[id] || { box: 1, seen: 0, correct: 0 };   // a new card enters box 1 when first shown
    const firstTime = s.seen === 0; const known = s.box >= KNOWN_BOX;
    s.seen += 1; s.lastSeen = today;
    if (result === 'correct') { s.correct += 1; s.box = firstTime ? KNOWN_BOX : Math.min(5, s.box + 1); }   // right first time = she already knew it
    else { s.box = known ? Math.max(1, s.box - 1) : 1; }                                                      // a slip on a known card costs one box, not all
    if (s.box === 1) { s.dueSession = sessionIndex + 1; s.due = today; }
    else { s.due = addDays(today, BOX_DAYS[s.box]); s.dueSession = null; }
    p.cards[id] = s; return s;
  }

  /* ---------- Stages ---------- */
  function stageCards(cards, stage) { return cards.filter(c => c.stage === stage); }
  function stageStats(p, cards, stage) {
    const list = stageCards(cards, stage);
    const known = list.filter(c => isKnown(p, c.id)).length;
    const seen = list.filter(c => !!cardState(p, c.id)).length;
    return { total: list.length, known, seen };
  }
  /* a level may name the stage it follows ("after": 1 for stage 7, 7 for stage 8); default = the previous number */
  function prevStageOf(stage, levels) { const l = (levels || []).find(x => x.stage === stage); return l && l.after ? l.after : stage - 1; }
  function isUnlocked(p, cards, stage, levels) {
    if (stage === 1) return true;
    if ((p.manualUnlocked || []).includes(stage)) return true;
    const before = prevStageOf(stage, levels);
    const prev = stageStats(p, cards, before);
    const ratio = (p.settings && p.settings.unlockRatio) || DEFAULT_SETTINGS.unlockRatio;
    return prev.total > 0 && prev.known >= Math.ceil(prev.total * ratio) && isUnlocked(p, cards, before, levels);
  }
  function highestUnlocked(p, cards, levels) {
    let h = 1; for (const l of levels) if (isUnlocked(p, cards, l.stage, levels)) h = Math.max(h, l.stage); return h;
  }
  /* the stage new cards are drawn from: the highest unlocked stage that still has unseen cards, else the lowest with unseen cards */
  function currentStage(p, cards, levels) {
    const h = highestUnlocked(p, cards, levels);
    for (let s = h; s >= 1; s--) if (stageCards(cards, s).some(c => !cardState(p, c.id))) return s;
    return h;
  }

  /* ---------- Streak: distinct play days, current run (ending today or yesterday), best run ---------- */
  function streak(p, today) {
    const days = [...new Set((p.sessions || []).map(s => s.date))].sort(); if (!days.length) return { days: 0, current: 0, best: 0 };
    let best = 1, run = 1;
    for (let i = 1; i < days.length; i++) { run = addDays(days[i - 1], 1) === days[i] ? run + 1 : 1; best = Math.max(best, run); }
    const last = days[days.length - 1]; const current = (last === today || addDays(last, 1) === today) ? run : 0;
    return { days: days.length, current, best };
  }

  /* day number since the app's first day (inclusive): started 9 Oct, today 17 Oct -> day 9 */
  function daysSince(startKey, today) { if (!startKey) return 0; const d = (k) => { const [y, m, dd] = k.split('-').map(Number); return Date.UTC(y, m - 1, dd); }; return Math.max(0, Math.round((d(today) - d(startKey)) / 86400000) + 1); }

  /* ---------- Daily cap ---------- */
  function sessionsOn(p, today) { return p.sessions.filter(s => s.date === today).length; }
  function canStart(p, now) {
    now = now || new Date(); const today = dateKey(now); const st = p.settings || DEFAULT_SETTINGS;
    const n = sessionsOn(p, today);
    if (n >= st.sessionsPerDay) return { ok: false, reason: 'cap', left: 0 };
    const last = p.sessions[p.sessions.length - 1];
    if (last && last.endedAt) {
      const waitMs = (st.breakMinutes || 0) * 60000 - (now.getTime() - last.endedAt);
      if (waitMs > 0) return { ok: false, reason: 'break', left: st.sessionsPerDay - n, waitMs };
    }
    return { ok: true, left: st.sessionsPerDay - n };
  }

  /* ---------- Session building ---------- */
  function shuffle(a, rnd) { rnd = rnd || Math.random; a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  function buildSession(p, cards, levels, today, rnd) {
    rnd = rnd || Math.random;
    const st = p.settings || DEFAULT_SETTINGS; const N = st.cardsPerSession; const sIdx = p.sessionCount;
    const unlocked = new Set(levels.filter(l => isUnlocked(p, cards, l.stage, levels)).map(l => l.stage));
    const pool = cards.filter(c => unlocked.has(c.stage));
    const chosen = []; const used = new Set();
    const take = (c) => { if (c && !used.has(c.id) && chosen.length < N) { chosen.push(c); used.add(c.id); return true; } return false; };

    // 1. review cards due today (lowest box first, then oldest), up to 3
    const due = pool.filter(c => isDue(p, c.id, today, sIdx)).sort((a, b) => (p.cards[a.id].box - p.cards[b.id].box) || ((p.cards[a.id].lastSeen || '') < (p.cards[b.id].lastSeen || '') ? -1 : 1));
    const maxReview = Math.min(Math.max(2, Math.round(N * 0.2)), N - 2);   // about 20 % review (2 of 10), the rest new
    for (const c of shuffle(due, rnd)) { if (chosen.length >= maxReview) break; take(c); }

    // 2. new cards from the current stage, in JSON order (the deck is sequenced on purpose)
    const cur = currentStage(p, cards, levels);
    const fresh = stageCards(cards, cur).filter(c => !cardState(p, c.id));
    for (const c of fresh) { if (chosen.length >= N) break; take(c); }

    // 3. still short? new cards from any unlocked stage, then a peek at the NEXT stage (new beats repetition),
    //    then the remaining due cards, then least-recently-seen known cards
    for (const c of pool.filter(c => !cardState(p, c.id))) take(c);
    const nextStage = highestUnlocked(p, cards, levels) + 1;
    for (const c of stageCards(cards, nextStage).filter(c => !cardState(p, c.id))) take(c);
    for (const c of due) take(c);
    const rest = pool.filter(c => cardState(p, c.id)).sort((a, b) => ((p.cards[a.id].lastSeen || '') < (p.cards[b.id].lastSeen || '') ? -1 : 1));
    for (const c of rest) take(c);

    // 4. guarantees: one 'do' card once stage 4 is open, one 'silly' once stage 5 is open
    const ensure = (type, stage) => {
      if (!unlocked.has(stage) || chosen.some(c => c.type === type)) return;
      const cands = pool.filter(c => c.type === type && !used.has(c.id));
      const pick = cands.find(c => isDue(p, c.id, today, sIdx)) || cands.find(c => !cardState(p, c.id)) || shuffle(cands, rnd)[0];
      if (!pick) return;
      // replace the last non-new, non-guaranteed card (or the last card)
      let i = chosen.length - 1;
      while (i > 0 && (chosen[i].type === 'do' || chosen[i].type === 'silly')) i--;
      used.delete(chosen[i].id); chosen[i] = pick; used.add(pick.id);
    };
    ensure('do', 4); ensure('silly', 5);

    // 5. order: start with something easy she knows, end with a movement card if present
    const order = chosen.slice();
    const doIdx = order.findIndex(c => c.type === 'do');
    if (doIdx >= 0) { const d = order.splice(doIdx, 1)[0]; order.push(d); }
    return order;
  }

  /* practice session: N cards from one open stage — due first, then the least-known, then the rest shuffled */
  function buildPractice(p, cards, levels, stage, today, rnd) {
    rnd = rnd || Math.random; const st = p.settings || DEFAULT_SETTINGS; const N = st.cardsPerSession; const sIdx = p.sessionCount;
    if (!isUnlocked(p, cards, stage, levels)) return [];
    const pool = shuffle(stageCards(cards, stage), rnd);
    const box = (c) => (cardState(p, c.id) ? cardState(p, c.id).box : 1.5);   // struggling cards first, then unseen, then known
    const due = pool.filter(c => isDue(p, c.id, today, sIdx));
    const rest = pool.filter(c => !due.includes(c)).sort((a, b) => box(a) - box(b));
    const chosen = due.concat(rest).slice(0, N);
    if (stage >= 4 && !chosen.some(c => c.type === 'do')) { const d = pool.find(c => c.type === 'do'); if (d) chosen[chosen.length - 1] = d; }
    const i = chosen.findIndex(c => c.type === 'do'); if (i >= 0) chosen.push(chosen.splice(i, 1)[0]);
    return chosen;
  }

  /* distractors for a 'find' card: pictures of cards already seen in the same stage (fallback: same stage, then any) */
  function pickDistractors(p, cards, card, n, rnd, assetOf) {
    rnd = rnd || Math.random; assetOf = assetOf || (c => c.id);
    const same = cards.filter(c => c.stage === card.stage && c.id !== card.id && assetOf(c) !== assetOf(card));
    const seen = same.filter(c => !!cardState(p, c.id));
    const uniq = (list) => { const out = [], s = new Set(); for (const c of list) { const k = assetOf(c); if (!s.has(k)) { s.add(k); out.push(c); } } return out; };
    let pick = uniq(shuffle(seen, rnd)).slice(0, n);
    if (pick.length < n) pick = uniq(pick.concat(shuffle(same.filter(c => !pick.includes(c)), rnd))).slice(0, n);
    if (pick.length < n) pick = uniq(pick.concat(shuffle(cards.filter(c => c.id !== card.id && !pick.includes(c)), rnd))).slice(0, n);
    return pick;
  }
  function choicesFor(p) { return (p.sessionCount < ((p.settings && p.settings.bigPickAfter) || 5)) ? 2 : 3; }

  function finishSession(p, cardsPlayed, today, now, mission) {
    p.sessionCount += 1; p.stars += 1;
    p.sessions.push({ date: today, endedAt: now.getTime(), cards: cardsPlayed.map(c => c.id), mission: mission });
    p.starBook.push({ date: today, n: p.stars });
    return p;
  }
  function missionFor(cardsPlayed, rnd) {
    rnd = rnd || Math.random;
    const m = cardsPlayed.filter(c => c.mission).map(c => c.mission);
    if (m.length) return m[Math.floor(rnd() * m.length)];
    return DEFAULT_MISSIONS[Math.floor(rnd() * DEFAULT_MISSIONS.length)];
  }

  const Engine = { BOX_DAYS, KNOWN_BOX, DEFAULT_SETTINGS, DEFAULT_MISSIONS, dateKey, addDays, emptyProgress, cardState, isKnown, isDue, recordAnswer,
    stageCards, stageStats, isUnlocked, highestUnlocked, currentStage, sessionsOn, canStart, streak, daysSince, buildSession, buildPractice, pickDistractors, choicesFor, finishSession, missionFor, shuffle };
  if (typeof module !== 'undefined' && module.exports) module.exports = Engine; else root.Engine = Engine;
})(typeof window !== 'undefined' ? window : globalThis);
