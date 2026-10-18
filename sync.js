/* Cloud copy of Zaineb's progress, so Safari, the home-screen icon and the laptop share one state.
   Server: apps-script/Code.gs (a Google Apps Script web app; apiUrl in config.js). Empty apiUrl = nothing here runs.
   Core (pure, Node-testable): isEmpty, pickWinner.  Browser: mount(api) -> { boot, schedule, flush, now, status, onChange }. */
(function (root) {
  /* a copy with no finished session, no card touched and no sticker is "empty" (a fresh icon, or after "مسح كل التقدم") */
  function isEmpty(p) {
    return !p || typeof p !== 'object' || (!(p.sessionCount > 0) && !Object.keys(p.cards || {}).length && !((p.stickers && p.stickers.got) || []).length);
  }
  /* which copy to keep: 'local' | 'remote' | 'same'. A finished session is never lost: the copy with more sessions wins;
     with the same count the later change (updatedAt, device clock) wins. KEEP IDENTICAL in apps-script/Code.gs (tests/sync.test.js checks). */
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
  const core = { isEmpty, pickWinner };

  /* api: { config: {apiUrl, family, secret}, getP(), adopt(remote), busy() -> a session is running } */
  function mount(api) {
    const cfg = api.config || {}; const KEY = 'zp:sync:v1';
    const enabled = () => !!cfg.apiUrl;
    const fallback = () => ({ pending: false, force: false, lastSyncAt: 0, last: 'never', lastError: '', device: '' });
    let st = fallback();
    try { st = Object.assign(fallback(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
    const write = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
    let timer = null, retry = null, inflight = null, backoff = 30000, lastRefresh = 0; const listeners = [];

    function device() {
      if (!st.device) {
        const ipad = /iPad|iPhone/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        st.device = (navigator.standalone ? 'icon' : 'browser') + '-' + (ipad ? 'ipad' : 'mac') + '-' + Math.random().toString(36).slice(2, 6); write();
      }
      return st.device;
    }
    async function post(body) {
      const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null; const t = setTimeout(() => ctl && ctl.abort(), 25000);
      try {
        const r = await fetch(cfg.apiUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, cache: 'no-store', redirect: 'follow',
                                            body: JSON.stringify(Object.assign({ family: cfg.family || 'zaineb', secret: cfg.secret || '', device: device() }, body)), signal: ctl ? ctl.signal : undefined });
        return await r.json();
      } finally { clearTimeout(t); }
    }
    function status() { return { enabled: enabled(), pending: st.pending, lastSyncAt: st.lastSyncAt, last: st.last, error: st.lastError || '', busy: !!inflight, device: st.device }; }
    function emit() { listeners.forEach(f => { try { f(status()); } catch (e) {} }); }
    function ok() { st.lastSyncAt = Date.now(); st.last = 'ok'; st.lastError = ''; backoff = 30000; clearTimeout(retry); }
    function fail(e) { st.last = (typeof navigator !== 'undefined' && navigator.onLine === false) ? 'offline' : 'error'; st.lastError = String(e && e.message || e); write(); armRetry(); }
    function armRetry() { clearTimeout(retry); retry = setTimeout(() => { if (st.pending) flush(); }, backoff); backoff = Math.min(backoff * 2, 10 * 60000); }
    /* the server (or a load) handed us its copy: adopt it only if it still wins against what is here now; push ours if ours wins */
    function consider(remote) {
      const w = pickWinner(api.getP(), remote);
      if (w === 'remote') api.adopt(remote); else if (w === 'local') schedule({ delay: 50 });
      return w;
    }
    /* a change was saved locally: send it soon (a burst of saves becomes one request); the flag survives a closed app */
    function schedule(opts) {
      if (!enabled()) return; st.pending = true; if (opts && opts.force) st.force = true; write();
      clearTimeout(timer); timer = setTimeout(() => flush(), (opts && opts.delay != null) ? opts.delay : 2000);
    }
    /* send the local copy now. The server keeps whichever copy wins (unless force) and returns its own when it kept that */
    function flush() {
      if (!enabled()) return Promise.resolve(null);
      if (inflight) return inflight;
      clearTimeout(timer);
      inflight = (async () => {
        try {
          const force = st.force;
          const res = await post({ action: 'save', force, state: api.getP() });
          if (!res || !res.ok) throw new Error((res && res.error) || 'bad_response');
          st.pending = false; if (force) st.force = false; ok(); write();
          if (res.kept === 'server' && res.state) res.adopted = consider(res.state) === 'remote';
          return res;
        } catch (e) { fail(e); return null; }
        finally { inflight = null; emit(); }
      })();
      return inflight;
    }
    /* ask for the server copy and merge (used at boot and when the app comes back to the front) */
    function load() {
      if (!enabled()) return Promise.resolve(null);
      if (inflight) return inflight;
      inflight = (async () => {
        try {
          const res = await post({ action: 'load' });
          if (!res || !res.ok) throw new Error((res && res.error) || 'bad_response');
          ok(); write();
          res.winner = res.state ? consider(res.state) : (isEmpty(api.getP()) ? 'same' : 'local');
          if (res.winner === 'local' && !res.state) schedule({ delay: 50 });
          return res;
        } catch (e) { fail(e); return null; }
        finally { inflight = null; emit(); }
      })();
      return inflight;
    }
    function refresh() {
      if (!enabled() || inflight || (api.busy && api.busy())) return;
      if (Date.now() - lastRefresh < 60000) return; lastRefresh = Date.now();
      st.pending ? flush() : load();
    }
    function boot() {
      if (!enabled()) return Promise.resolve(null);
      window.addEventListener('online', () => { st.pending ? flush() : refresh(); });
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refresh(); });
      lastRefresh = Date.now();
      return st.pending ? flush() : load();
    }
    return { boot, schedule, flush, load, refresh, now: flush, status, onChange(f) { listeners.push(f); }, device };
  }

  const Sync = { core, mount };
  if (typeof module !== 'undefined' && module.exports) module.exports = Sync; else root.Sync = Sync;
})(typeof window !== 'undefined' ? window : globalThis);
