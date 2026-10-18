#!/usr/bin/env node
/* Local stand-in for the Google Apps Script web app, for testing the sync in a browser WITHOUT touching Google.
   It runs the real apps-script/Code.gs (doGet / doPost) against an in-memory Sheet, with the same quirks as Apps Script:
   a POST answers with a 302 to a second URL that serves the JSON, and every answer carries Access-Control-Allow-Origin: *.
     node scripts/mock_cloud.js [port=8161] [secret=test-secret]
   Then open the app with  ?api=http://127.0.0.1:8161/  (the override only works on localhost; config.js stays empty).
   GET /_dump shows the sheet contents; POST /_reset empties them. */
const http = require('http'), fs = require('fs'), path = require('path'), vm = require('vm');
const PORT = +(process.argv[2] || process.env.PORT || 8161), SECRET = process.argv[3] || process.env.SECRET || 'test-secret';

/* ---- a tiny Google Sheets look-alike: only what Code.gs uses ---- */
class Range {
  constructor(sh, r, c, nr, nc) { Object.assign(this, { sh, r, c, nr, nc }); }
  getValues() { const out = []; for (let i = 0; i < this.nr; i++) { const row = this.sh.data[this.r - 1 + i] || []; out.push(Array.from({ length: this.nc }, (_, j) => row[this.c - 1 + j] === undefined ? '' : row[this.c - 1 + j])); } return out; }
  setValues(v) { for (let i = 0; i < this.nr; i++) { while (this.sh.data.length < this.r + i) this.sh.data.push([]); const row = this.sh.data[this.r - 1 + i]; for (let j = 0; j < this.nc; j++) row[this.c - 1 + j] = v[i][j]; } return this; }
  getValue() { return this.getValues()[0][0]; }
  setValue(v) { return this.setValues([[v]]); }
}
class Sheet {
  constructor(name) { this.name = name; this.data = []; this.frozen = 0; }
  getName() { return this.name; }
  getLastRow() { return this.data.length; }
  getLastColumn() { return Math.max(0, ...this.data.map(r => r.length)); }
  getRange(r, c, nr, nc) { return new Range(this, r, c, nr || 1, nc || 1); }
  setFrozenRows(n) { this.frozen = n; }
  deleteRows(r, n) { this.data.splice(r - 1, n || 1); }
}
class Spreadsheet {
  constructor() { this.sheets = {}; }
  getSheetByName(n) { return this.sheets[n] || null; }
  insertSheet(n) { return (this.sheets[n] = new Sheet(n)); }
  getSheets() { return Object.values(this.sheets); }
}
let ss = new Spreadsheet(); const props = { SECRET };
const sandbox = {
  console, Logger: { log: (...a) => console.log('[Logger]', ...a) },
  SpreadsheetApp: { getActive: () => ss },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = v; } }) },
  ContentService: { MimeType: { JSON: 'application/json' }, createTextOutput: (t) => ({ _t: t, setMimeType() { return this; }, getContent() { return this._t; } }) },
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'Code.gs'), 'utf8'), sandbox, { filename: 'Code.gs' });

/* ---- HTTP: POST -> 302 -> GET /r/<id>, like script.google.com ---- */
const answers = new Map(); let n = 0;
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
const send = (res, code, body, extra) => { res.writeHead(code, Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, cors, extra || {})); res.end(body); };
http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  if (req.method === 'OPTIONS') return send(res, 204, '');
  if (req.method === 'GET' && url.pathname.startsWith('/r/')) { const a = answers.get(url.pathname.slice(3)); return a ? send(res, 200, a) : send(res, 404, '{"ok":false,"error":"gone"}'); }
  if (req.method === 'GET' && url.pathname === '/_dump') return send(res, 200, JSON.stringify(Object.fromEntries(ss.getSheets().map(s => [s.name, s.data.map(r => r.map(v => v instanceof Date ? v.toISOString() : (typeof v === 'string' && v.length > 60 ? v.slice(0, 60) + '…' : v)))])), null, 1));
  if (req.method === 'POST' && url.pathname === '/_reset') { ss = new Spreadsheet(); return send(res, 200, '{"ok":true}'); }
  if (req.method === 'GET') return send(res, 200, sandbox.doGet().getContent());
  let body = ''; req.on('data', d => { body += d; }); req.on('end', () => {
    const out = sandbox.doPost({ postData: { contents: body } }).getContent(); const id = String(++n);
    answers.set(id, out); setTimeout(() => answers.delete(id), 60000);
    let summary = ''; try { const o = JSON.parse(out); summary = o.ok ? (o.kept || 'load:' + (o.state ? 'state' : 'null')) : 'error:' + o.error; } catch (e) {}
    console.log(new Date().toISOString().slice(11, 19), 'POST', body.length, 'bytes ->', summary);
    res.writeHead(302, Object.assign({ Location: `http://127.0.0.1:${PORT}/r/${id}` }, cors)); res.end();
  });
}).listen(PORT, '127.0.0.1', () => console.log(`mock cloud on http://127.0.0.1:${PORT}/  secret=${SECRET}  (GET /_dump, POST /_reset)`));
