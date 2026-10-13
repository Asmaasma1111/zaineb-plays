const test = require('node:test'); const assert = require('node:assert');
const S = require('../stickerbook.js').core; const E = require('../engine.js');
const catalog = require('../stickers/stickers.json').stickers;

test('earning rule: one sticker per finished session by default; per-sessions setting', () => {
  assert.equal(S.earned(0, 1), 0); assert.equal(S.earned(1, 1), 1); assert.equal(S.earned(7, 1), 7);
  assert.equal(S.earned(1, 2), 0); assert.equal(S.earned(2, 2), 1); assert.equal(S.earned(5, 2), 2); assert.equal(S.earned(3, 0), 3, 'per below 1 counts as 1');
});
test('sync adds stickers in catalogue order, never removes, caps at the catalogue, reports the new ones', () => {
  const p = E.emptyProgress(); p.sessionCount = 2;
  const fresh = S.sync(p, catalog, 1); assert.equal(fresh.length, 2); assert.deepEqual(p.stickers.got.map(g => g.file), [catalog[0].file, catalog[1].file]);
  assert.ok(fresh.every(g => g.seen === false));
  assert.equal(S.unseen(p).length, 2); p.stickers.got[0].seen = true; assert.equal(S.unseen(p).length, 1);
  p.sessionCount = 1; assert.equal(S.sync(p, catalog, 1).length, 0); assert.equal(p.stickers.got.length, 2, 'stickers are never taken away');
  p.sessionCount = 500; S.sync(p, catalog, 1); assert.equal(p.stickers.got.length, catalog.length, 'capped at the catalogue');
  const q = E.emptyProgress(); q.sessionCount = 3; S.sync(q, catalog, 2); assert.equal(q.stickers.got.length, 1, 'one per two sessions');
});
test('pages of 4', () => { assert.equal(S.pageOf(0), 0); assert.equal(S.pageOf(3), 0); assert.equal(S.pageOf(4), 1); assert.equal(S.pageCount(catalog.length), 8); assert.equal(catalog.length, 32); });
