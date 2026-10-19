const test = require('node:test'); const assert = require('node:assert');
const E = require('../engine.js');
const DATA = require('../zaineb_cards.json');
const cards = DATA.cards, levels = DATA.levels;
const seeded = (s) => () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };

test('Leitner boxes: correct moves up, wrong/help back to box 1, due dates follow 0/1/3/7/14', () => {
  const p = E.emptyProgress(); const t = '2026-10-09';
  let s = E.recordAnswer(p, '1-01', 'correct', t, 0); assert.equal(s.box, 3, 'right the first time = already known, box 3'); assert.equal(s.due, '2026-10-12'); assert.ok(E.isKnown(p, '1-01'));
  s = E.recordAnswer(p, '1-01', 'correct', '2026-10-12', 1); assert.equal(s.box, 4); assert.equal(s.due, '2026-10-19');
  s = E.recordAnswer(p, '1-01', 'correct', '2026-10-19', 2); assert.equal(s.box, 5); assert.equal(s.due, '2026-11-02');
  s = E.recordAnswer(p, '1-01', 'correct', '2026-11-02', 3); assert.equal(s.box, 5, 'box 5 is the top');
  s = E.recordAnswer(p, '1-01', 'wrong', '2026-11-02', 4); assert.equal(s.box, 4, 'a slip on a known card costs one box'); assert.ok(E.isKnown(p, '1-01'));
  s = E.recordAnswer(p, '1-02', 'wrong', t, 0); assert.equal(s.box, 1); assert.equal(s.dueSession, 1);
  s = E.recordAnswer(p, '1-02', 'correct', t, 1); assert.equal(s.box, 2, 'learned after a miss: box 2, +1 day');
  s = E.recordAnswer(p, '1-02', 'help', '2026-10-10', 2); assert.equal(s.box, 1, 'help on a card not yet known -> box 1');
});

test('isDue: box 1 is due next session, box 2+ by date', () => {
  const p = E.emptyProgress();
  E.recordAnswer(p, '1-01', 'wrong', '2026-10-09', 0);
  assert.equal(E.isDue(p, '1-01', '2026-10-09', 0), false); assert.equal(E.isDue(p, '1-01', '2026-10-09', 1), true);
  E.recordAnswer(p, '1-01', 'correct', '2026-10-09', 1);
  assert.equal(E.isDue(p, '1-01', '2026-10-09', 5), false); assert.equal(E.isDue(p, '1-01', '2026-10-10', 5), true);
});

test('unlock rule: stage 2 opens at 60% of stage 1 known (15 of 24), stages open in order', () => {
  const p = E.emptyProgress();
  const s1 = E.stageCards(cards, 1); assert.equal(s1.length, 24);
  assert.ok(E.isUnlocked(p, cards, 1, levels)); assert.ok(!E.isUnlocked(p, cards, 2, levels));
  const know = (id) => { E.recordAnswer(p, id, 'correct', '2026-10-01', 0); };
  s1.slice(0, 14).forEach(c => know(c.id)); assert.ok(!E.isUnlocked(p, cards, 2, levels), '14/24 is not enough');
  assert.ok(!E.isUnlocked(p, cards, 7, levels), 'stage 7 follows stage 1 and needs the same 60%');
  know(s1[14].id); assert.ok(E.isUnlocked(p, cards, 2, levels), '15/24 opens stage 2');
  assert.ok(!E.isUnlocked(p, cards, 3, levels));
  assert.ok(E.isUnlocked(p, cards, 7, levels), 'stage 7 opens off stage 1, not stage 6');
  assert.ok(!E.isUnlocked(p, cards, 8, levels), 'stage 8 waits for stage 7');
  const s7 = E.stageCards(cards, 7); assert.equal(s7.length, 15); s7.slice(0, 9).forEach(c => know(c.id)); assert.ok(E.isUnlocked(p, cards, 8, levels), '9/15 of stage 7 opens stage 8');
  p.manualUnlocked.push(4); assert.ok(E.isUnlocked(p, cards, 4, levels), 'manual unlock works'); assert.ok(!E.isUnlocked(p, cards, 5, levels));
  assert.equal(E.highestUnlocked(p, cards, levels), 8, 'highest unlocked stage');
  assert.equal(E.currentStage(p, cards, levels), 8, 'new cards come from the highest open stage that still has unseen cards');
});

test('session: 5 cards, no duplicates, new cards come from the current stage, up to 3 reviews', () => {
  const p = E.emptyProgress(); p.settings.cardsPerSession = 5; const t = '2026-10-09';
  const s0 = E.buildSession(p, cards, levels, t, seeded(1));
  assert.equal(s0.length, 5); assert.equal(new Set(s0.map(c => c.id)).size, 5);
  assert.ok(s0.every(c => c.stage === 1)); assert.deepEqual(s0.map(c => c.id), ['1-01', '1-02', '1-03', '1-04', '1-05'], 'first session follows deck order');
  s0.forEach(c => E.recordAnswer(p, c.id, c.id === '1-02' ? 'wrong' : 'correct', t, 0)); E.finishSession(p, s0, t, new Date(2026, 9, 9, 10), 'm');
  const s1 = E.buildSession(p, cards, levels, t, seeded(2));
  assert.equal(s1.length, 5);
  const reviews = s1.filter(c => p.cards[c.id]); assert.ok(reviews.length <= 3 && reviews.length >= 1);
  assert.ok(reviews.some(c => c.id === '1-02'), 'the wrong card (box 1) comes back next session');
  assert.ok(s1.filter(c => !p.cards[c.id]).length >= 2, 'at least two new cards');
});

test('session guarantees: a do card once stage 4 is open, a silly card once stage 5 is open; do card goes last', () => {
  const p = E.emptyProgress(); p.settings.cardsPerSession = 5; p.manualUnlocked = [2, 3, 4, 5]; p.sessionCount = 20;
  const s = E.buildSession(p, cards, levels, '2026-10-09', seeded(3));
  assert.equal(s.length, 5); assert.ok(s.some(c => c.type === 'do')); assert.ok(s.some(c => c.type === 'silly'));
  assert.equal(s[s.length - 1].type, 'do');
});

test('daily cap and break: 2 sessions a day, then rest; break between sessions', () => {
  const p = E.emptyProgress(); const d = new Date(2026, 9, 9, 9, 0);
  assert.ok(E.canStart(p, d).ok);
  E.finishSession(p, [], '2026-10-09', d, 'm');
  const r1 = E.canStart(p, new Date(2026, 9, 9, 9, 5)); assert.ok(!r1.ok && r1.reason === 'break');
  assert.ok(E.canStart(p, new Date(2026, 9, 9, 13, 30)).ok);
  E.finishSession(p, [], '2026-10-09', new Date(2026, 9, 9, 13, 30), 'm');
  const r2 = E.canStart(p, new Date(2026, 9, 9, 15, 0)); assert.ok(!r2.ok && r2.reason === 'cap');
  assert.ok(E.canStart(p, new Date(2026, 9, 10, 8, 0)).ok, 'next day is fine');
  assert.equal(p.stars, 2);
});

test('distractors: same stage, seen first, never the target, 2 then 3 choices', () => {
  const p = E.emptyProgress(); assert.equal(E.choicesFor(p), 2); p.sessionCount = 5; assert.equal(E.choicesFor(p), 3);
  ['1-01', '1-02', '1-03'].forEach(id => E.recordAnswer(p, id, 'correct', '2026-10-09', 0));
  const d = E.pickDistractors(p, cards, cards.find(c => c.id === '1-04'), 2, seeded(4));
  assert.equal(d.length, 2); assert.ok(d.every(c => c.stage === 1 && c.id !== '1-04')); assert.ok(d.every(c => ['1-01', '1-02', '1-03'].includes(c.id)));
  const d0 = E.pickDistractors(E.emptyProgress(), cards, cards.find(c => c.id === '1-01'), 1, seeded(5));
  assert.equal(d0.length, 1, 'fallback when nothing has been seen');
});

test('mission: from the session cards when any has one, else a default', () => {
  assert.equal(E.missionFor([cards.find(c => c.id === '2-01')], seeded(1)), 'جيبيلي حاجة حمراء!');
  assert.ok(E.DEFAULT_MISSIONS.includes(E.missionFor([cards.find(c => c.id === '1-01')], seeded(1))));
});

test('practice: N cards from one open stage, due and weakest first, nothing from a locked stage', () => {
  const p = E.emptyProgress(); p.settings.cardsPerSession = 5; const t = '2026-10-09';
  ['1-01', '1-02', '1-03'].forEach(id => E.recordAnswer(p, id, 'correct', t, 0)); E.recordAnswer(p, '1-04', 'wrong', t, 0);
  const s = E.buildPractice(p, cards, levels, 1, t, seeded(7));
  assert.equal(s.length, 5); assert.ok(s.every(c => c.stage === 1)); assert.equal(new Set(s.map(c => c.id)).size, 5);
  assert.ok(s.some(c => c.id === '1-04'), 'the wrong card is in the practice set');
  assert.deepEqual(E.buildPractice(p, cards, levels, 3, t, seeded(7)), [], 'locked stage gives nothing');
  p.manualUnlocked = [2, 3, 4];
  const s4 = E.buildPractice(p, cards, levels, 4, t, seeded(8)); assert.equal(s4[s4.length - 1].type, 'do', 'movement card last in stage 4');
});

test('bigger sessions: 10 cards by default, about 20% review, rest new; 4-hour nap between sessions', () => {
  const p = E.emptyProgress(); const t = '2026-10-09';
  assert.equal(p.settings.cardsPerSession, 10); assert.equal(p.settings.breakMinutes, 240);
  const s0 = E.buildSession(p, cards, levels, t, seeded(11)); assert.equal(s0.length, 10);
  s0.forEach(c => E.recordAnswer(p, c.id, 'wrong', t, 0)); E.finishSession(p, s0, t, new Date(2026, 9, 9, 10), 'm');
  const s1 = E.buildSession(p, cards, levels, t, seeded(12)); assert.equal(s1.length, 10);
  assert.equal(s1.filter(c => p.cards[c.id]).length, 2, 'two reviews'); assert.equal(s1.filter(c => !p.cards[c.id]).length, 8, 'eight new');
  assert.ok(!E.canStart(p, new Date(2026, 9, 9, 13, 0)).ok, 'still napping 3 h later'); assert.ok(E.canStart(p, new Date(2026, 9, 9, 14, 30)).ok, 'afternoon session after 4 h');
});

test('streak counts distinct days, the current run and the best run', () => {
  const p = E.emptyProgress();
  ['2026-10-10', '2026-10-10', '2026-10-11', '2026-10-13', '2026-10-14', '2026-10-15'].forEach(d => p.sessions.push({ date: d, endedAt: 0, cards: [] }));
  assert.deepEqual(E.streak(p, '2026-10-15'), { days: 5, current: 3, best: 3 });
  assert.deepEqual(E.streak(p, '2026-10-16'), { days: 5, current: 3, best: 3 }, 'yesterday still counts');
  assert.deepEqual(E.streak(p, '2026-10-18'), { days: 5, current: 0, best: 3 }, 'a missed day breaks the run');
  assert.deepEqual(E.streak(E.emptyProgress(), '2026-10-18'), { days: 0, current: 0, best: 0 });
});

test('when the open stages have no new cards left, a session peeks at the next stage instead of repeating known cards', () => {
  const p = E.emptyProgress(); const t = '2026-10-17';
  E.stageCards(cards, 1).forEach(c => E.recordAnswer(p, c.id, 'correct', '2026-10-01', 0));     // whole stage 1 known and not due
  p.settings.unlockRatio = 2;                                                                    // keep stage 2 locked for the test
  const s = E.buildSession(p, cards, levels, t, seeded(3));
  assert.ok(s.some(c => c.stage === 2), 'stage-2 cards appear although stage 2 is locked');
  assert.ok(!s.some(c => c.stage === 1 && E.isKnown(p, c.id) && !E.isDue(p, c.id, t, p.sessionCount)), 'no known, not-due stage-1 card is repeated');
});

test('day number since the start is inclusive', () => {
  assert.equal(E.daysSince('2026-10-09', '2026-10-17'), 9); assert.equal(E.daysSince('2026-10-09', '2026-10-09'), 1); assert.equal(E.daysSince(null, '2026-10-17'), 0);
});
