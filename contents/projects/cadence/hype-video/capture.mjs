// Step 1 of the Cadence hype video: capture clean UI states from the live site's
// demo mode (staged sample data, nothing personal). Writes assets/ + assets/manifest.json.
//   node capture.mjs
import { chromium } from 'file:///C:/cadence/tools/demo-video/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'assets');
const BASE = 'https://cadence-delta-five.vercel.app';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const W = 1920, H = 1200;

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const context = await browser.newContext({ viewport: { width: W, height: H }, colorScheme: 'dark' });

// A big cursor and click ripple, drawn into the captured frames.
await context.addInitScript(() => {
  const install = () => {
    if (document.getElementById('__c')) return;
    const st = document.createElement('style');
    st.textContent = `
      #__c { position: fixed; z-index: 2147483647; left: 0; top: 0; pointer-events: none; transform: translate(-200px,-200px); }
      #__c svg { filter: drop-shadow(0 4px 8px rgba(0,0,0,.5)); }
      .__r { position: fixed; z-index: 2147483646; width: 70px; height: 70px; margin: -35px 0 0 -35px; border-radius: 50%;
        border: 3px solid #d8b878; pointer-events: none; animation: __rp 620ms cubic-bezier(.2,.8,.2,1) forwards; }
      @keyframes __rp { from { transform: scale(.2); opacity: 1 } to { transform: scale(1.6); opacity: 0 } }
      .toast, .demo-banner { visibility: hidden !important; }
    `;
    document.documentElement.appendChild(st);
    const c = document.createElement('div'); c.id = '__c';
    c.innerHTML = '<svg width="40" height="40" viewBox="0 0 24 24"><path d="M4 2l15 11.5-6.6 1.1 3.9 6.9-2.9 1.6-3.9-7L4 20z" fill="#0b0b0b" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>';
    document.documentElement.appendChild(c);
    document.addEventListener('mousemove', e => { c.style.transform = `translate(${e.clientX - 5}px,${e.clientY - 3}px)`; }, true);
    document.addEventListener('mousedown', e => {
      const r = document.createElement('div'); r.className = '__r'; r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px';
      document.documentElement.appendChild(r); setTimeout(() => r.remove(), 700);
    }, true);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
});

const page = await context.newPage();
page.setDefaultTimeout(12000);
const cdp = await context.newCDPSession(page);
const sleep = ms => page.waitForTimeout(ms);
const manifest = { width: W, height: H, sequences: {}, stills: {}, focus: {} };

let seq = null;
cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
  if (seq) {
    const file = `${seq.name}-${String(seq.frames.length).padStart(4, '0')}.jpg`;
    fs.writeFileSync(path.join(OUT, file), Buffer.from(data, 'base64'));
    seq.frames.push({ file, t: metadata.timestamp });
  }
  try { await cdp.send('Page.screencastFrameAck', { sessionId }); } catch {}
});
async function sequence(name, fn) {
  seq = { name, frames: [] };
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 94, maxWidth: W, maxHeight: H });
  await fn();
  const end = Date.now() / 1000;
  await cdp.send('Page.stopScreencast');
  await sleep(150);
  const t0 = seq.frames[0].t;
  manifest.sequences[name] = { frames: seq.frames.map(f => ({ file: f.file, t: +(f.t - t0).toFixed(4) })), duration: +(end - t0).toFixed(3) };
  seq = null;
}
async function still(name) {
  await page.evaluate(() => document.fonts.ready);
  await sleep(300);
  await page.screenshot({ path: path.join(OUT, `${name}.jpg`), type: 'jpeg', quality: 94 });
  manifest.stills[name] = `${name}.jpg`;
}
async function rect(name, selector) {
  manifest.focus[name] = await page.$eval(selector, el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
}
let mouse = { x: W * 0.7, y: H * 0.7 };
async function moveTo(x, y, ms = 500) {
  const steps = Math.max(10, Math.round(ms / 24));
  const sx = mouse.x, sy = mouse.y;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps, e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    await page.mouse.move(sx + (x - sx) * e, sy + (y - sy) * e);
    await sleep(12);
  }
  mouse = { x, y };
}
async function setTheme(ui, theme) {
  await page.evaluate(([ui, theme]) => {
    const s = JSON.parse(localStorage.getItem('cadence_demo_store'));
    Object.assign(s.settings, { uiTheme: ui, theme, showBanner: false });
    localStorage.setItem('cadence_demo_store', JSON.stringify(s));
    localStorage.setItem('cadence_appearance', JSON.stringify({ theme, ui, accent: 'ember' }));
  }, [ui, theme]);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.today-header');
  await page.evaluate(() => document.fonts.ready);
  await sleep(2200); // entrance animations settle
}

// ---- A fresh demo workspace, Modern Dark ----
await page.goto(BASE + '/');
await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Try the demo' }).first().click();
await page.waitForSelector('.today-header');
await setTheme('standard', 'dark');
await page.mouse.move(mouse.x, mouse.y);

// 1. Today: "Mark done" on the Up next card; the ring and counts roll forward.
await rect('upnext', '.up-next');
await rect('summary', '.summary');
const done = page.locator('.up-next .btn-primary').first();
const db = await done.boundingBox();
await sequence('tick', async () => {
  await sleep(250);
  await moveTo(db.x + db.width / 2, db.y + db.height / 2, 650);
  await sleep(120);
  await page.mouse.down(); await sleep(70); await page.mouse.up();
  await sleep(1700);
});
manifest.focus.tickClick = { x: db.x + db.width / 2, y: db.y + db.height / 2 };

// 2. Quick add: type a routine in plain English, the parse appears as you type.
await page.evaluate(() => document.querySelector('#today-quick-add').scrollIntoView({ block: 'center' }));
await sleep(700);
const qa = await page.locator('#today-quick-add').boundingBox();
await moveTo(qa.x + 140, qa.y + qa.height / 2, 300);
await page.mouse.down(); await page.mouse.up();
await sleep(300);
await sequence('type', async () => {
  await sleep(150);
  await page.keyboard.type('gym mon wed fri 7am', { delay: 55 });
  await sleep(1300);
});
manifest.focus.type = await page.$eval('#today-quick-add', el => {
  const box = el.closest('.panel, .smart-add, form, section') || el;
  const r = box.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height };
});
manifest.focus.typeField = { x: qa.x, y: qa.y, w: qa.width, h: qa.height };
await page.keyboard.press('Escape');
await page.mouse.move(W + 50, H + 50); mouse = { x: W + 50, y: H + 50 };
await page.evaluate(() => document.activeElement?.blur());

// 3. The same Today screen in other themes (stills).
for (const [ui, theme] of [['standard', 'dark'], ['cyberpunk', 'dark'], ['clay', 'light'], ['retro', 'light'], ['sketch', 'light'], ['industrial', 'light'], ['organic', 'light']]) {
  await setTheme(ui, theme);
  await page.evaluate(() => window.scrollTo(0, 0));
  await still(`theme-${ui}`);
}

// 4. Lock In in the Retro theme: the TIMER.EXE clock counting down.
await setTheme('retro', 'light');
await page.locator('.sidebar .lockin-launch').first().click();
await page.locator('.dialog button', { hasText: 'Strength training' }).first().click();
await page.locator('.dialog button', { hasText: 'Start session' }).first().click();
await page.waitForSelector('.focus-mode');
await sleep(1800);
await rect('timer', '.focus-timer');
await sequence('lockin', async () => { await sleep(2200); });

fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ sequences: Object.fromEntries(Object.entries(manifest.sequences).map(([k, v]) => [k, `${v.frames.length} frames / ${v.duration}s`])), stills: Object.keys(manifest.stills), focus: manifest.focus }));
await browser.close();
