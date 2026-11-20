// shim.js: lets the extension's real pages run in a plain browser tab for the ad render.
//  - chrome.storage.local backed by localStorage (shared by every same-origin frame)
//  - a fake clock: Date follows the ad's timeline (window.top.__adMs) so timers and countdowns
//    inside the real UI advance with video time, not wall-clock time.
(() => {
  const KEY = 'lockout_demo_state';
  const q = new URLSearchParams(location.search);

  // ---- fake clock ----
  const RealDate = Date;
  const realNow = () => RealDate.now();
  const fakeNow = () => {
    try { const t = window.top; return t && t.__adMs ? t.__adMs : realNow(); } catch { return realNow(); }
  };
  class FakeDate extends RealDate {
    constructor(...a) { if (a.length === 0) super(fakeNow()); else super(...a); }
    static now() { return fakeNow(); }
  }
  window.Date = FakeDate;

  // ---- chrome.storage ----
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
  const listeners = [];
  const pick = (obj, keys) => {
    if (keys == null) return { ...obj };
    const ks = Array.isArray(keys) ? keys : typeof keys === 'string' ? [keys] : Object.keys(keys);
    const out = {};
    for (const k of ks) if (k in obj) out[k] = obj[k];
    return out;
  };
  // A frame opened with ?theme=... keeps that theme even when other frames write a different one
  const themeLock = q.get('theme');
  const fix = (changes) => { if (themeLock && changes.theme) changes.theme = { ...changes.theme, newValue: themeLock }; return changes; };
  window.chrome = {
    runtime: { id: 'demo', onMessage: { addListener(f) { window.__onMsg = f; } } },
    storage: {
      local: {
        get: async (keys) => {
          const out = pick(read(), keys);
          const theme = q.get('theme');
          if (theme && (keys == null || [].concat(keys).includes('theme'))) out.theme = theme;
          return out;
        },
        set: async (patch) => {
          const s = read();
          const changes = {};
          for (const [k, v] of Object.entries(patch)) {
            changes[k] = { oldValue: s[k], newValue: v };
            s[k] = v;
          }
          localStorage.setItem(KEY, JSON.stringify(s));
          listeners.forEach(f => f(fix(changes), 'local'));
        }
      },
      onChanged: { addListener: (f) => listeners.push(f) }
    }
  };
  // Writes made by other frames arrive as 'storage' events
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return;
    const o = JSON.parse(e.oldValue || '{}');
    const n = JSON.parse(e.newValue || '{}');
    const changes = {};
    for (const k of new Set([...Object.keys(o), ...Object.keys(n)])) {
      if (JSON.stringify(o[k]) !== JSON.stringify(n[k])) changes[k] = { oldValue: o[k], newValue: n[k] };
    }
    if (Object.keys(changes).length) listeners.forEach(f => f(fix(changes), 'local'));
  });
})();
