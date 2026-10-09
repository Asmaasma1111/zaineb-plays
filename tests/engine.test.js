const test = require('node:test'); const assert = require('node:assert');
const E = require('../engine.js');
const DATA = require('../zaineb_cards.json');
const cards = DATA.cards, levels = DATA.levels;
const seeded = (s) => () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };

test('Leitner boxes: correct moves up, wrong/help back to box 1, due dates follow 0/1/3/7/14', () => {
  const p = E.emptyProgress(); const t = '2026-10-09';
  let s = E.recordAnswer(p, '1-01', 'correct', t, 0); assert.equal(s.box, 2, 'new card starts in box 1, correct -> box 2'); assert.equal(s.due, '2026-10-10');
  s = E.recordAnswer(p, '1-01', 'correct', '2026-10-10', 1); assert.equal(s.box, 3); assert.equal(s.due, '2026-10-13'); assert.ok(E.isKnown(p, '1-01'));
  s = E.recordAnswer(p, '1-01', 'correct', '2026-10-13', 2); assert.equal(s.box, 4); assert.equal(s.due, '2026-10-20');
  s = E.recordAnswer(p, '1-01', 'correct', '2026-10-20', 3); assert.equal(s.box, 5); assert.equal(s.due, '2026-11-03');
  s = E.recordAnswer(p, '1-01', 'correct', '2026-11-03', 4); assert.equal(s.box, 5, 'box 5 is the top');
  s = E.recordAnswer(p, '1-01', 'help', '2026-11-03', 5); assert.equal(s.box, 1); assert.equal(s.dueSession, 6); assert.ok(!E.isKnown(p, '1-01'));
  s = E.recordAnswer(p, '1-02', 'wrong', t, 0); assert.equal(s.box, 1); assert.equal(s.dueSession, 1);
});

test('isDue: box 1 is due next session, box 2+ by date', () => {
  const p = E.emptyProgress();
  E.recordAnswer(p, '1-01', 'wrong', '2026-10-09', 0);
  assert.equal(E.isDue(p, '1-01', '2026-10-09', 0), false); assert.equal(E.isDue(p, '1-01', '2026-10-09', 1), true);
  E.recordAnswer(p, '1-01', 'correct', '2026-10-09', 1);
  assert.equal(E.isDue(p, '1-01', '2026-10-09', 5), false); assert.equal(E.isDue(p, '1-01', '2026-10-10', 5), true);
});

test('unlock rule: stage 2 opens at 80% of stage 1 known (13 of 16), stages open in order', () => {
  const p = E.emptyProgress();
  const s1 = E.stageCards(cards, 1); assert.equal(s1.length, 16);
  assert.ok(E.isUnlocked(p, cards, 1)); assert.ok(!E.isUnlocked(p, cards, 2));
  const know = (id) => { E.recordAnswer(p, id, 'correct', '2026-10-01', 0); E.recordAnswer(p, id, 'correct', '2026-10-02', 1); };
  s1.slice(0, 12).forEach(c => know(c.id)); assert.ok(!E.isUnlocked(p, cards, 2), '12/16 is not enough');
  know(s1[12].id); assert.ok(E.isUnlocked(p, cards, 2), '13/16 opens stage 2');
  assert.ok(!E.isUnlocked(p, cards, 3));
  p.manualUnlocked.push(4); assert.ok(E.isUnlocked(p, cards, 4), 'manual unlock works'); assert.ok(!E.isUnlocked(p, cards, 5));
  assert.equal(E.highestUnlocked(p, cards, levels), 2, 'highest contiguous unlocked stage');
});

test('session: 5 cards, no duplicates, new cards come from the current stage, up to 3 reviews', () => {
  const p = E.emptyProgress(); const t = '2026-10-09';
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
  const p = E.emptyProgress(); p.manualUnlocked = [2, 3, 4, 5]; p.sessionCount = 20;
  const s = E.buildSession(p, cards, levels, '2026-10-09', seeded(3));
  assert.equal(s.length, 5); assert.ok(s.some(c => c.type === 'do')); assert.ok(s.some(c => c.type === 'silly'));
  assert.equal(s[s.length - 1].type, 'do');
});

test('daily cap and break: 2 sessions a day, then rest; break between sessions', () => {
  const p = E.emptyProgress(); const d = new Date(2026, 9, 9, 9, 0);
  assert.ok(E.canStart(p, d).ok);
  E.finishSession(p, [], '2026-10-09', d, 'm');
  const r1 = E.canStart(p, new Date(2026, 9, 9, 9, 5)); assert.ok(!r1.ok && r1.reason === 'break');
  assert.ok(E.canStart(p, new Date(2026, 9, 9, 9, 30)).ok);
  E.finishSession(p, [], '2026-10-09', new Date(2026, 9, 9, 9, 30), 'm');
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
  const p = E.emptyProgress(); const t = '2026-10-09';
  ['1-01', '1-02', '1-03'].forEach(id => E.recordAnswer(p, id, 'correct', t, 0)); E.recordAnswer(p, '1-04', 'wrong', t, 0);
  const s = E.buildPractice(p, cards, levels, 1, t, seeded(7));
  assert.equal(s.length, 5); assert.ok(s.every(c => c.stage === 1)); assert.equal(new Set(s.map(c => c.id)).size, 5);
  assert.ok(s.some(c => c.id === '1-04'), 'the wrong card is in the practice set');
  assert.deepEqual(E.buildPractice(p, cards, levels, 3, t, seeded(7)), [], 'locked stage gives nothing');
  p.manualUnlocked = [2, 3, 4];
  const s4 = E.buildPractice(p, cards, levels, 4, t, seeded(8)); assert.equal(s4[s4.length - 1].type, 'do', 'movement card last in stage 4');
});
