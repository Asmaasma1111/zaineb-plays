const test = require('node:test'); const assert = require('node:assert');
const fs = require('fs'); const path = require('path');
const Sync = require('../sync.js').core; const E = require('../engine.js');
const { pickWinner, isEmpty } = Sync;

const prog = (sessions, updatedAt, extra) => Object.assign(E.emptyProgress(), { sessionCount: sessions, stars: sessions, updatedAt }, extra || {});

test('isEmpty: a fresh copy is empty; a touched card, a session or a sticker makes it count', () => {
  assert.ok(isEmpty(null)); assert.ok(isEmpty(undefined)); assert.ok(isEmpty(E.emptyProgress()));
  assert.ok(isEmpty(prog(0, 5, { settings: { hints: false } })), 'settings alone do not make a copy worth keeping');
  assert.ok(!isEmpty(prog(1, 0)));
  assert.ok(!isEmpty(prog(0, 0, { cards: { '1-01': { box: 1, seen: 1, correct: 0 } } })));
  assert.ok(!isEmpty(prog(0, 0, { stickers: { got: [{ i: 0 }] } })));
});

test('pickWinner: the copy with more finished sessions wins, whatever the clocks say', () => {
  assert.equal(pickWinner(prog(3, 100), prog(5, 1)), 'remote', 'the icon lost its stickers: the server has more sessions');
  assert.equal(pickWinner(prog(6, 1), prog(5, 100)), 'local', 'a session played offline is never lost to a newer-looking server copy');
});

test('pickWinner: same number of sessions -> the later change wins; identical -> same', () => {
  assert.equal(pickWinner(prog(5, 10), prog(5, 20)), 'remote', 'settings changed on the laptop after the iPad');
  assert.equal(pickWinner(prog(5, 30), prog(5, 20)), 'local');
  assert.equal(pickWinner(prog(5, 20), prog(5, 20)), 'same');
  assert.equal(pickWinner(prog(5), prog(5)), 'same', 'no timestamps at all (progress saved before this version)');
  assert.equal(pickWinner(prog(5), prog(5, 1)), 'remote', 'a stamped copy beats an unstamped one of the same size');
});

test('pickWinner: an empty side never wins against a real one; two empty copies are the same', () => {
  assert.equal(pickWinner(E.emptyProgress(), prog(2, 1)), 'remote', 'a new home-screen icon adopts the cloud copy');
  assert.equal(pickWinner(prog(2, 1), null), 'local', 'first device ever: push');
  assert.equal(pickWinner(prog(2, 1), E.emptyProgress()), 'local');
  assert.equal(pickWinner(E.emptyProgress(), null), 'same');
  assert.equal(pickWinner(null, E.emptyProgress()), 'same');
  assert.equal(pickWinner(prog(0, 99, { settings: { hints: false } }), prog(1, 1)), 'remote', 'after "مسح كل التقدم" without force the cloud copy would come back (reset uses force)');
});

test('pickWinner never throws on odd input', () => {
  for (const [a, b] of [[{}, {}], [{ sessionCount: 'x' }, { sessionCount: 2, cards: {} }], [{ cards: null }, { stickers: null }], ['nope', 5]]) assert.ok(['local', 'remote', 'same'].includes(pickWinner(a, b)));
});

test('apps-script/Code.gs carries the very same merge rule as sync.js', () => {
  const grab = (src, name) => {                       // the function's text up to its balanced closing brace
    const i = src.indexOf('function ' + name + '('); assert.ok(i >= 0, name + ' missing');
    let depth = 0, j = src.indexOf('{', i);
    for (; j < src.length; j++) { if (src[j] === '{') depth++; else if (src[j] === '}' && --depth === 0) break; }
    return src.slice(i, j + 1).replace(/\s+/g, ' ').trim();
  };
  const gs = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'Code.gs'), 'utf8');
  const js = fs.readFileSync(path.join(__dirname, '..', 'sync.js'), 'utf8');
  for (const fn of ['isEmpty', 'pickWinner']) assert.equal(grab(gs, fn), grab(js, fn), fn + ' differs between Code.gs and sync.js');
});
