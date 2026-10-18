/* زينب تلعب وتتعلم — the cloud copy of Zaineb's progress (by Dr. Asma Khattala).
   A Google Apps Script web app bound to a Google Sheet, same pattern as the Speak Cards backend. Two tabs:
     Progress   one row per family: the latest progress JSON (split over cells of 40,000 characters), when it was saved,
                when the device last changed it, and which device sent it
     History    the last 40 copies received (newest at the bottom): a wrong overwrite can be undone by hand from here
   Requests are POSTed as JSON text:
     {action:'ping',  family, secret}                        -> {ok}
     {action:'load',  family, secret}                        -> {ok, state|null, savedAt, device}
     {action:'save',  family, secret, device, force, state}  -> {ok, kept:'client'|'server'|'same', state?, savedAt}
   `save` keeps whichever copy wins by pickWinner (more finished sessions, then the later change) unless force is true;
   when the server copy wins it is returned so the device can adopt it. "setup" (run once from the editor) adds the two
   tabs and creates the SECRET script property; it never deletes anything and is safe to re-run. */

var APP = 'zaineb-plays';
var TAB = { progress: 'Progress', history: 'History' };
var PARTS = 10, PART_LEN = 40000, HISTORY_MAX = 40;
var PROG = ['Family', 'Saved (server time)', 'Changed (device time)', 'Device', 'Sessions', 'Stars', 'Stickers', 'Parts'];
var HIST = ['Time', 'Family', 'Device', 'Sessions', 'Stars', 'Stickers', 'Kept', 'Parts'];
for (var i_ = 1; i_ <= PARTS; i_++) { PROG.push('Part ' + i_); HIST.push('Part ' + i_); }
var FIRST_PART = 9;                                  // 1-based column of "Part 1" in both tabs
var LIMITS = { body: PARTS * PART_LEN + 4000, state: PARTS * PART_LEN, family: 40, device: 40 };

/* ---------- web app ---------- */
function doGet() { return json_({ ok: true, app: APP, time: new Date().toISOString() }); }

function doPost(e) {
  var body = (e && e.postData && e.postData.contents) || '';
  if (body.length > LIMITS.body) return json_({ ok: false, error: 'too_big' });
  var req;
  try { req = JSON.parse(body); } catch (err) { return json_({ ok: false, error: 'bad_json' }); }
  if (!req || typeof req !== 'object' || Array.isArray(req)) return json_({ ok: false, error: 'bad_json' });
  try {
    var want = secret_();
    if (!want) return json_({ ok: false, error: 'setup_needed' });
    if (String(req.secret || '') !== want) return json_({ ok: false, error: 'bad_secret' });
    var family = clean_(req.family, LIMITS.family).toLowerCase();
    if (!family) return json_({ ok: false, error: 'bad_family' });
    if (req.action === 'ping') return json_({ ok: true });
    if (req.action === 'load') return json_(load_(family));
    if (req.action === 'save') return json_(save_(family, req));
    return json_({ ok: false, error: 'unknown_action' });
  } catch (err) {
    console.error(err && err.stack || err);
    return json_({ ok: false, error: 'server' });
  }
}
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

/* ---------- merge rule: KEEP IDENTICAL to sync.js (tests/sync.test.js compares the two) ---------- */
function isEmpty(p) {
  return !p || typeof p !== 'object' || (!(p.sessionCount > 0) && !Object.keys(p.cards || {}).length && !((p.stickers && p.stickers.got) || []).length);
}
function pickWinner(local, remote) {
  if (isEmpty(remote)) return isEmpty(local) ? 'same' : 'local';
  if (isEmpty(local)) return 'remote';
  var ls = local.sessionCount || 0, rs = remote.sessionCount || 0;
  if (rs > ls) return 'remote';
  if (ls > rs) return 'local';
  var lt = +local.updatedAt || 0, rt = +remote.updatedAt || 0;
  if (rt > lt) return 'remote';
  if (lt > rt) return 'local';
  return 'same';
}

/* ---------- requests ---------- */
function load_(family) {
  var sh = sheet_(book_(), TAB.progress, PROG);
  var row = findRow_(sh, family);
  if (!row) return { ok: true, state: null, savedAt: null, device: '' };
  var s = readStored_(sh, row);
  return { ok: true, state: s.state, savedAt: iso_(s.savedAt), device: s.device };
}

function save_(family, req) {
  var incoming = req.state;
  if (!validState_(incoming)) return { ok: false, error: 'bad_state' };
  var device = clean_(req.device, LIMITS.device);
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var ss = book_(), sh = sheet_(ss, TAB.progress, PROG);
    var row = findRow_(sh, family);
    var stored = row ? readStored_(sh, row) : null;
    if (req.force !== true && stored && stored.state) {
      var w = pickWinner(incoming, stored.state);
      if (w === 'remote') return { ok: true, kept: 'server', state: stored.state, savedAt: iso_(stored.savedAt), device: stored.device };
      if (w === 'same') return { ok: true, kept: 'same', savedAt: iso_(stored.savedAt) };
    }
    var now = new Date();
    var txt = JSON.stringify(incoming), parts = split_(txt);
    var vals = [family, now, incoming.updatedAt ? new Date(+incoming.updatedAt) : '', device, incoming.sessionCount || 0, incoming.stars || 0,
                stickers_(incoming), Math.ceil(txt.length / PART_LEN)].concat(parts);
    sh.getRange(row || sh.getLastRow() + 1, 1, 1, PROG.length).setValues([vals]);
    history_(ss, [now, family, device, incoming.sessionCount || 0, incoming.stars || 0, stickers_(incoming), req.force === true ? 'forced' : 'client',
                  Math.ceil(txt.length / PART_LEN)].concat(parts));
    return { ok: true, kept: 'client', savedAt: now.toISOString() };
  } finally { lock.releaseLock(); }
}

/* ---------- sheet storage ---------- */
function book_() { return SpreadsheetApp.getActive(); }
function sheet_(ss, name, header) {
  var sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.getRange(1, 1, 1, header.length).setValues([header]); sh.setFrozenRows(1); }
  return sh;
}
function findRow_(sh, family) {
  var last = sh.getLastRow(); if (last < 2) return 0;
  var v = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < v.length; i++) if (String(v[i][0]) === family) return i + 2;
  return 0;
}
function readStored_(sh, row) {
  var vals = sh.getRange(row, 1, 1, PROG.length).getValues()[0];
  var n = +vals[7] || 0, txt = '';
  for (var i = 0; i < n && i < PARTS; i++) txt += String(vals[FIRST_PART - 1 + i] || '').replace(/^~/, '');
  var state = null; try { state = JSON.parse(txt); } catch (e) { state = null; }
  if (state && typeof state !== 'object') state = null;
  return { state: state, savedAt: vals[1], device: String(vals[3] || '') };
}
/* every part starts with "~" so that no cell can ever be read as a formula; it is removed when read back */
function split_(txt) {
  var parts = [];
  for (var i = 0; i < txt.length; i += PART_LEN) parts.push('~' + txt.substr(i, PART_LEN));
  while (parts.length < PARTS) parts.push('');
  return parts;
}
function history_(ss, rowVals) {
  var sh = sheet_(ss, TAB.history, HIST);
  sh.getRange(sh.getLastRow() + 1, 1, 1, HIST.length).setValues([rowVals]);
  var extra = sh.getLastRow() - 1 - HISTORY_MAX;
  if (extra > 0) sh.deleteRows(2, extra);
}

/* ---------- helpers ---------- */
function secret_() { return String(PropertiesService.getScriptProperties().getProperty('SECRET') || ''); }
function clean_(v, max) { return String(v == null ? '' : v).replace(/[^\w.:-]/g, '').slice(0, max); }
function iso_(d) { return d instanceof Date && !isNaN(d) ? d.toISOString() : (d ? String(d) : null); }
function stickers_(p) { return ((p && p.stickers && p.stickers.got) || []).length; }
function validState_(p) {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return false;
  if (!p.cards || typeof p.cards !== 'object' || Array.isArray(p.cards)) return false;
  if (p.sessionCount != null && typeof p.sessionCount !== 'number') return false;
  return JSON.stringify(p).length <= LIMITS.state;
}

/* ---------- run once from the editor: adds the tabs and the SECRET, prints the line for config.js ---------- */
function setup() {
  var ss = book_();
  sheet_(ss, TAB.progress, PROG); sheet_(ss, TAB.history, HIST);
  var props = PropertiesService.getScriptProperties();
  var s = props.getProperty('SECRET');
  if (!s) { s = newSecret_(); props.setProperty('SECRET', s); }
  Logger.log('Tabs ready. Put this in config.js (apiUrl = the web app URL ending in /exec):');
  Logger.log("window.ZP_CONFIG = { apiUrl: '<URL>', family: 'zaineb', secret: '" + s + "' };");
  return s;
}
function showSecret() { Logger.log(secret_() || '(none yet: run setup)'); return secret_(); }
function newSecret_() {
  var a = 'abcdefghijkmnpqrstuvwxyz23456789', s = '';
  for (var i = 0; i < 24; i++) s += a.charAt(Math.floor(Math.random() * a.length));
  return s;
}
