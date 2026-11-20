// CollectorHub — commercial-style ad, frame-accurate capture.
//
// 1) Seed (fresh throwaway Chrome profile only): reorder the app's built-in demo garage so the
//    showcase opens on real-car castings, and warm the card-photo cache. No project code changes.
// 2) Capture: Playwright's fake clock drives the app (rAF, performance.now, timers), so each frame
//    is advanced exactly 1/30 s and screenshotted at 1920x1200 — no lag regardless of render speed.
//    An overlay injected into the page draws the "commercial": eased camera moves (CSS transform
//    on #root), Anton captions, vignette, big cursor + click ripple, blur kicks at cuts, name card.
//
// Usage: node ad-capture.mjs <framesDir>   (CollectorHub dev server on BASE, default http://localhost:5180)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE || 'http://localhost:5180';
const OUT = path.resolve(process.argv[2] || 'ad-frames');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const FPS = 30;
const TOTAL = 360; // 12 s
const VIEW = { width: 1280, height: 800 }; // × deviceScaleFactor 1.5 = 1920×1200
const SCAN_QUERY = "'95 MAZDA RX-7   HTC46   HW J-IMPORTS 9/10";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Showcase order for the ad: real-car castings only (fantasy castings are hidden in the ad profile).
const ORDER = [
  "'95 Mazda RX-7",
  'Nissan Skyline 2000GT-R LBWK',
  'Porsche 911 Turbo 3.6 (964)',
  'Lamborghini Sián FKP 37',
  'McLaren Solus GT',
  "'82 Toyota Supra",
  "'90 Honda Civic EF",
  'Datsun Bluebird Wagon (510)',
  'Corvette C8.R',
  'Kool Kombi',
];

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--hide-scrollbars'],
});

async function until(page, fn, arg, ms = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await page.evaluate(fn, arg).catch(() => false)) return true;
    await sleep(150);
  }
  return false;
}
const imagesDone = () =>
  [...document.querySelectorAll('img')].every((i) => i.complete) &&
  !document.querySelector('.bc-case.is-waiting');
const heroReady = () => !!document.querySelector('.sc-hero canvas') && !document.querySelector('.sc-hero .animate-pulse');

// ── 1. Seed + warm-up (real clock, not captured) ──
const statePath = path.join(OUT, '..', 'ad-state.json');
{
  const ctx = await browser.newContext({ viewport: VIEW, colorScheme: 'dark' });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/garage`);
  // Wait for the app to create its demo data before reordering it.
  await until(page, () => JSON.parse(localStorage.getItem('collectorhub_items') || '[]').length >= 10);
  await page.evaluate((order) => {
    const items = JSON.parse(localStorage.getItem('collectorhub_items') || '[]');
    const now = Date.now();
    const keep = items.filter((it) => order.includes(it.name) || it.name === 'Nissan Skyline GT-R (BNR34)');
    keep.forEach((it) => {
      const rank = order.indexOf(it.name);
      const t = new Date(now - (rank < 0 ? 99 : rank) * 3600_000).toISOString();
      it.createdAt = t; // newest first = showcase order
      it.personal = { ...it.personal, isFavorite: rank >= 0 && rank < 6 };
    });
    localStorage.setItem('collectorhub_items', JSON.stringify(keep));
    localStorage.setItem('collectorhub_garage_view', 'showcase');
  }, ORDER);
  await page.goto(`${BASE}/garage?view=showcase`);
  await until(page, heroReady);
  await sleep(2500);
  for (let i = 0; i < 5; i++) {
    await page.click('[aria-label="Next car"]');
    await sleep(1800);
  }
  await page.click('role=tab[name="Shelf"]');
  await until(page, imagesDone);
  await page.goto(`${BASE}/scan`);
  await page.waitForSelector('text=Matching against', { timeout: 20000 });
  await page.fill('#manual-search', SCAN_QUERY);
  await page.press('#manual-search', 'Enter');
  await until(page, imagesDone);
  await sleep(1500);
  await ctx.storageState({ path: statePath });
  await ctx.close();
}

// ── 2. Overlay ("the commercial"), injected on every page ──
const OVERLAY = () => {
  window.__ad = {
    ensure() {
      if (document.getElementById('ad-ov')) return;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Anton&display=block';
      document.head.appendChild(link);
      const st = document.createElement('style');
      st.textContent = `
        html, body { background:#090909 !important; overflow:hidden !important; }
        #root { transform-origin:0 0; will-change:transform; }
        aside { visibility:hidden !important; } /* sidebar out of frame: layout unchanged, no menu fragments at the edges */
        #ad-ov { position:fixed; inset:0; z-index:2147483647; pointer-events:none; font-family:Anton, Impact, sans-serif; }
        #ad-ov .vig { position:absolute; inset:0; background:radial-gradient(ellipse at 50% 46%, transparent 52%, rgba(0,0,0,.62) 100%); }
        #ad-ov .shade { position:absolute; inset:0; background:linear-gradient(0deg, rgba(9,9,9,.92) 0%, rgba(9,9,9,.55) 22%, transparent 46%); opacity:0; }
        #ad-ov .cap { position:absolute; left:72px; bottom:64px; color:#e9e3d8; font-size:86px; line-height:.95; letter-spacing:.01em; text-transform:uppercase; text-shadow:0 6px 40px rgba(0,0,0,.65); opacity:0; white-space:nowrap; }
        #ad-ov .cursor { position:absolute; left:0; top:0; width:46px; height:46px; opacity:0; filter:drop-shadow(0 6px 10px rgba(0,0,0,.55)); }
        #ad-ov .ripple { position:absolute; width:120px; height:120px; margin:-60px 0 0 -60px; border-radius:50%; border:4px solid #e9e3d8; opacity:0; }
        #ad-ov .card { position:absolute; inset:0; background:#090909; display:grid; place-content:center; justify-items:center; gap:26px; opacity:0; }
        #ad-ov .card .name { color:#e9e3d8; font-size:150px; line-height:1; letter-spacing:.02em; text-transform:uppercase; }
        #ad-ov .card .line { width:190px; height:6px; background:#d8b878; border-radius:3px; }
      `;
      document.head.appendChild(st);
      const ov = document.createElement('div');
      ov.id = 'ad-ov';
      ov.innerHTML = `<div class="shade"></div><div class="vig"></div><div class="cap"></div><div class="ripple"></div>
        <svg class="cursor" viewBox="0 0 24 24"><path d="M4 2.5 L4 19.5 L8.6 15.4 L11.6 22 L14.6 20.7 L11.7 14.2 L18 14.2 Z" fill="#fff" stroke="#090909" stroke-width="1.4" stroke-linejoin="round"/></svg>
        <div class="card"><div class="name">CollectorHub</div><div class="line"></div></div>`;
      document.body.appendChild(ov);
    },
    raw(sel, i = 0) {
      const root = document.getElementById('root');
      const prev = root.style.transform;
      root.style.transform = 'none';
      const el = document.querySelectorAll(sel)[i];
      const r = el ? el.getBoundingClientRect() : null;
      root.style.transform = prev;
      return r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null;
    },
    screen(sel, i = 0) {
      const el = document.querySelectorAll(sel)[i];
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    },
    set(s) {
      const root = document.getElementById('root');
      const ov = document.getElementById('ad-ov');
      const W = innerWidth, H = innerHeight;
      if (s.cam) {
        const k = s.cam.s;
        let tx = W / 2 - s.cam.x * k, ty = H / 2 - s.cam.y * k;
        const rh = Math.max(H, root.scrollHeight) * k;
        tx = Math.min(0, Math.max(W - W * k, tx));
        ty = Math.min(0, Math.max(H - rh, ty));
        root.style.transform = `translate(${tx}px, ${ty}px) scale(${k})`;
      }
      root.style.filter = s.blur > 0.05 ? `blur(${s.blur}px)` : 'none';
      const cap = ov.querySelector('.cap');
      cap.textContent = s.cap?.text || '';
      cap.style.opacity = s.cap?.a ?? 0;
      cap.style.transform = `translateY(${s.cap?.dy ?? 0}px)`;
      ov.querySelector('.shade').style.opacity = (s.cap?.a ?? 0) * 0.95;
      const cur = ov.querySelector('.cursor');
      cur.style.opacity = s.cursor?.a ?? 0;
      if (s.cursor) cur.style.transform = `translate(${s.cursor.x - 8}px, ${s.cursor.y - 4}px) scale(${s.cursor.press ? 0.86 : 1})`;
      const rip = ov.querySelector('.ripple');
      if (s.ripple) {
        rip.style.left = s.ripple.x + 'px';
        rip.style.top = s.ripple.y + 'px';
        rip.style.opacity = (1 - s.ripple.p) * 0.9;
        rip.style.transform = `scale(${0.25 + s.ripple.p * 1.25})`;
      } else rip.style.opacity = 0;
      ov.querySelector('.card').style.opacity = s.card ?? 0;
    },
  };
};

// ── 3. Capture ──
const ctx = await browser.newContext({
  viewport: VIEW,
  deviceScaleFactor: 1.5,
  colorScheme: 'dark',
  reducedMotion: 'no-preference',
  storageState: statePath,
});
await ctx.addInitScript(OVERLAY);
const page = await ctx.newPage();
await page.clock.install();

const ease = (p) => (p <= 0 ? 0 : p >= 1 ? 1 : p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2);
const out = (p) => (p <= 0 ? 0 : p >= 1 ? 1 : 1 - (1 - p) ** 3);
const lerp = (a, b, p) => a + (b - a) * p;
const span = (i, a, b) => Math.min(1, Math.max(0, (i - a) / (b - a)));
const camLerp = (A, B, p) => ({ x: lerp(A.x, B.x, p), y: lerp(A.y, B.y, p), s: lerp(A.s, B.s, p) });
const centre = (r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

/** Caption state: slides up + fades in at [a, a+8], fades out over the last 6 frames before b. */
function caption(i, text, a, b) {
  if (i < a || i > b) return null;
  const pin = out(span(i, a, a + 8));
  const pout = 1 - span(i, b - 6, b);
  return { text, a: pin * pout, dy: (1 - pin) * 28 };
}

let frame = 0;
let tick = 0;
async function shoot(state) {
  await page.evaluate((s) => window.__ad.set(s), state);
  await page.clock.runFor(tick++ % 3 === 2 ? 34 : 33); // 33/33/34 ms ≈ exactly 30 fps
  await page.screenshot({ path: path.join(OUT, `f${String(frame).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 92 });
  frame++;
}
async function prepare(url) {
  if (url) await page.goto(url);
  await page.evaluate(() => window.__ad.ensure());
  await until(page, async () => { await document.fonts.load('80px Anton'); return document.fonts.check('80px Anton'); });
  await page.evaluate(() => window.scrollTo(0, 0));
}
async function realClick(pt) {
  await page.mouse.move(pt.x, pt.y);
  await page.mouse.down();
  await page.mouse.up();
}

// Scene A — hook + hero showcase (frames 0–119)
await prepare(`${BASE}/garage?view=showcase`);
await until(page, heroReady);
await sleep(3500); // first card texture paints (real time)
await page.clock.pauseAt(Date.now() + 60_000);
await page.clock.runFor(800); // render a few 3D frames
{
  const hero = await page.evaluate(() => window.__ad.raw('.sc-hero'));
  const panel = await page.evaluate(() => window.__ad.raw('.sc-panel'));
  const nav = await page.evaluate(() => window.__ad.raw('.sc-nav'));
  const hookA = { ...centre(hero), s: 1.42 };
  const hookB = { ...centre(hero), s: 1.52 };
  const top = hero.y;
  const bottom = nav.y + nav.h;
  const overS = Math.min(1.16, (VIEW.height * 0.94) / (bottom - top));
  const over = { x: (hero.x + panel.x + panel.w) / 2, y: (top + bottom) / 2, s: overS };
  const start = { x: 1180, y: 770 };
  let clickPt = null;
  for (let i = 0; i < 120; i++) {
    const cam = i < 36 ? camLerp(hookA, hookB, ease(i / 36)) : camLerp(hookB, over, ease(span(i, 36, 58)));
    const card = i <= 9 ? 1 - out(i / 9) : 0;
    let cursor = null;
    let ripple = null;
    if (i >= 44 && i <= 116) {
      const target = await page.evaluate(() => window.__ad.screen('[aria-label="Next car"]'));
      const p = ease(span(i, 44, 62));
      cursor = { x: lerp(start.x, target.x, p), y: lerp(start.y, target.y, p), a: out(span(i, 44, 50)) * (1 - span(i, 108, 116)), press: i === 63 || i === 95 };
      clickPt = target;
    }
    for (const c of [63, 95]) if (i >= c && i <= c + 12 && clickPt) ripple = { ...clickPt, p: (i - c) / 12 };
    const cap = caption(i, 'Your garage.', 10, 34) || caption(i, 'Swipe through.', 58, 118);
    const blur = i >= 117 ? (i - 116) * 2.4 : 0;
    await shoot({ cam, card, cursor, ripple, cap, blur });
    if (i === 63 || i === 95) {
      await realClick(clickPt);
      await sleep(2600); // next card paints while the clock is paused, so the slide starts on this frame
    }
  }
}

// Scene B — the shelf (frames 120–191)
await page.evaluate(() => window.__ad.set({ cam: { x: 640, y: 400, s: 1 } }));
await page.click('role=tab[name="Shelf"]');
await until(page, imagesDone);
await sleep(1200);
{
  const row = await page.evaluate(() => window.__ad.raw('.rack-row'));
  const A = { x: row.x + row.w * 0.3, y: row.y + row.h * 0.52, s: 1.62 };
  const B = { x: row.x + row.w * 0.7, y: row.y + row.h * 0.52, s: 1.7 };
  for (let i = 0; i < 72; i++) {
    const p = ease(i / 71);
    const kick = i < 3 ? 1 + (3 - i) * 0.018 : 1;
    const cam = camLerp(A, B, p);
    cam.s *= kick;
    const blur = i < 3 ? (3 - i) * 3 : i >= 69 ? (i - 68) * 2.4 : 0;
    await shoot({ cam, cap: caption(i, 'Hang them up.', 6, 70), blur });
  }
}

// Scene C — scan to collect (frames 192–269)
await prepare(`${BASE}/scan`);
await page.waitForSelector('text=Matching against', { timeout: 20000 });
await page.fill('#manual-search', SCAN_QUERY);
await sleep(600);
{
  const form = await page.evaluate(() => window.__ad.raw('form:has(#manual-search)'));
  const camForm = { ...centre(form), s: 1.55 };
  let camRes = null;
  let btn = null;
  const start = { x: 1150, y: 760 };
  for (let i = 0; i < 78; i++) {
    let cam = camForm;
    if (camRes) cam = camLerp(camForm, camRes.a, ease(span(i, 15, 36)));
    if (camRes && i > 36) cam = camLerp(camRes.a, camRes.b, ease(span(i, 36, 77)));
    const kick = i < 3 ? 1 + (3 - i) * 0.018 : 1;
    cam = { ...cam, s: cam.s * kick };
    let cursor = null;
    let ripple = null;
    if (i <= 24) {
      if (!camRes) btn = await page.evaluate(() => window.__ad.screen('form:has(#manual-search) button[type="submit"]'));
      const p = ease(span(i, 2, 13));
      cursor = { x: lerp(start.x, btn.x, p), y: lerp(start.y, btn.y, p), a: out(span(i, 1, 6)) * (1 - span(i, 18, 24)), press: i === 14 };
    }
    if (i >= 14 && i <= 26) ripple = { ...btn, p: (i - 14) / 12 };
    const blur = i < 3 ? (3 - i) * 3 : i >= 75 ? (i - 74) * 2.4 : 0;
    await shoot({ cam, cursor, ripple, cap: caption(i, 'Scan to collect.', 20, 77), blur });
    if (i === 14) {
      await realClick(btn);
      await until(page, imagesDone, null, 8000);
      await sleep(1200);
      const li = await page.evaluate(() => window.__ad.raw('section ul[role="list"] > li'));
      const c = centre(li);
      camRes = { a: { ...c, s: 1.62 }, b: { ...c, s: 1.74 } };
    }
  }
}

// Scene D — payoff on a hero car, then the name card (frames 270–359)
await prepare(`${BASE}/garage?view=showcase`);
await until(page, heroReady);
await page.clock.runFor(600);
await page.click('.sc-thumb >> nth=3'); // Lamborghini Sián
await sleep(2800);
await page.clock.runFor(900); // let the slide settle (not captured)
{
  const hero = await page.evaluate(() => window.__ad.raw('.sc-hero'));
  const panel = await page.evaluate(() => window.__ad.raw('.sc-panel'));
  const mid = { x: (hero.x + hero.w / 2 + panel.x + panel.w / 2) / 2, y: hero.y + hero.h * 0.5 };
  const A = { ...mid, s: 1.12 };
  const B = { ...mid, s: 1.24 };
  for (let i = 0; i < 90; i++) {
    const kick = i < 3 ? 1 + (3 - i) * 0.018 : 1;
    const cam = camLerp(A, B, ease(i / 89));
    cam.s *= kick;
    const card = i >= 72 ? ease(span(i, 72, 86)) : 0;
    const blur = i < 3 ? (3 - i) * 3 : 0;
    await shoot({ cam, cap: caption(i, '4,041 releases.', 8, 70), blur, card });
  }
}

await browser.close();
console.log(JSON.stringify({ frames: frame, expected: TOTAL, seconds: frame / FPS, dir: OUT }));
