// Injected into the embedded dashboard (iframe only) before the app's own scripts run.
// The dashboard HTML/CSS/JS is the real project code; this only replaces the network layer
// with staged, deterministic data so frames can be rendered one by one.
(function () {
  if (window.top === window) return;

  const S = { mode: 'sync', manual: [0, 240, 255], brightness: 100, color: [0, 0, 0], fps: 8, threshold: 12 };
  window.__S = S;
  const mons = [
    { id: 0, name: 'Display 0 — Combined Virtual Desktop (1920x1080)', width: 1920, height: 1080, left: 0, top: 0 },
    { id: 1, name: 'Display 1 — 1920x1080', width: 1920, height: 1080, left: 0, top: 0 },
  ];
  const status = () => ({
    connected: true,
    address: 'DEMO-LIGHT',
    mode: S.mode,
    color: S.mode === 'manual' ? S.manual : S.color,
    manual_color: S.manual,
    brightness: S.brightness,
    fps: S.fps,
    threshold: S.threshold,
    selected_monitor_id: 1,
    active_monitor_desc: 'Display 1 — 1920x1080',
    active_monitor_rect: '1920x1080 (left=0, top=0)',
    monitors: mons,
  });

  window.fetch = async (url, opts) => {
    let body = {};
    try { body = JSON.parse((opts && opts.body) || '{}'); } catch (e) {}
    if (url === '/api/mode') S.mode = body.mode;
    if (url === '/api/color') { S.manual = [body.r, body.g, body.b]; S.brightness = body.brightness; }
    return { json: async () => status() };
  };

  class FakeWS {
    constructor() {
      window.__ws = this;
      setTimeout(() => this.onmessage && this.onmessage({ data: JSON.stringify({ type: 'status_update', status: status() }) }), 0);
    }
    close() {}
    send() {}
  }
  window.WebSocket = FakeWS;
  window.__push = (msg) => window.__ws && window.__ws.onmessage && window.__ws.onmessage({ data: JSON.stringify(msg) });

  document.addEventListener('DOMContentLoaded', () => {
    const st = document.createElement('style');
    st.textContent = '*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent}';
    document.head.appendChild(st);
    // Third-party product name replaced with the project's own name for the ad.
    const h1 = document.querySelector('.top-bar h1');
    if (h1) h1.textContent = 'Light Reaction';
  });
})();
