// Shared helpers for the VibeFlow hype-video pipeline.
// Everything here runs OUTSIDE the app: fake session/track/lyrics/cover are injected in the browser,
// the app's menus are hidden with injected CSS, and a big cursor + click ripple is drawn as a DOM overlay.
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'

export const URL = process.env.APP_URL || 'http://127.0.0.1:5173/'
export const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
export const VW = 1280 // CSS viewport; with deviceScaleFactor 1.5 the capture is 1920x1200
export const VH = 800
export const DSF = Number(process.env.DSF || 1.5)
export const OUT_W = Math.round(VW * DSF)
export const OUT_H = Math.round(VH * DSF)
export const JPEG_Q = Number(process.env.JPEGQ || 86)
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const ART = fs.readFileSync(path.resolve('art.png'))

// made-up lyrics; first line at 3.5 s, then one every 3.3 s
export const LYRICS = [
  'girl you look beautiful tonight',
  'stars on the ceiling',
  'all of the lights down low',
  'stay in the glow',
  'never let it fade away',
  'stay in the glow',
  'never let it fade away',
  'we are the only ones awake in this city',
  'music like this makes the whole room move',
  'hold on to the feeling',
  'stay in the glow',
  'never let it fade away'
]
const lrc = LYRICS.map((t, i) => {
  const ms = 3500 + i * 3300
  const m = String(Math.floor(ms / 60000)).padStart(2, '0')
  const s = ((ms % 60000) / 1000).toFixed(2).padStart(5, '0')
  return `[${m}:${s}] ${t}`
}).join('\n')
const ART_URL = 'https://sample-cover.invalid/cover.png'

export const seedScript = `(() => { let a = 1337; Math.random = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } })()`

// Big, clearly visible cursor + click ripple (DOM overlay, so the screencast captures it).
export const cursorScript = `(() => {
  const boot = () => {
    const c = document.createElement('div')
    c.style.cssText = 'position:fixed;left:-7px;top:-4px;z-index:2147483647;pointer-events:none;will-change:transform;transform:translate(-300px,-300px)'
    c.innerHTML = '<svg width="46" height="46" viewBox="0 0 24 24" style="display:block;filter:drop-shadow(0 4px 8px rgba(0,0,0,.6))"><path d="M4 2 L4 19 L8.6 14.8 L11.6 21.6 L14.3 20.4 L11.4 13.8 L17.8 13.8 Z" fill="#fff" stroke="#0b0b0b" stroke-width="1.3" stroke-linejoin="round"/></svg>'
    document.body.appendChild(c)
    const svg = c.firstChild
    window.__glide = (x0, y0, x1, y1, ms) => new Promise((res) => {
      const t0 = performance.now()
      const step = () => {
        const k = Math.min(1, (performance.now() - t0) / ms)
        const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2
        c.style.transform = 'translate(' + (x0 + (x1 - x0) * e) + 'px,' + (y0 + (y1 - y0) * e) + 'px)'
        k < 1 ? requestAnimationFrame(step) : res()
      }
      requestAnimationFrame(step)
    })
    addEventListener('pointermove', (e) => { c.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)' }, true)
    addEventListener('pointerdown', (e) => {
      svg.animate([{ transform: 'scale(1)' }, { transform: 'scale(0.82)' }], { duration: 110, fill: 'forwards', easing: 'ease-out' })
      const r = document.createElement('div')
      r.style.cssText = 'position:fixed;left:' + e.clientX + 'px;top:' + e.clientY + 'px;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;border:3px solid rgba(233,227,216,.95);box-shadow:0 0 18px rgba(216,184,120,.55);z-index:2147483646;pointer-events:none'
      document.body.appendChild(r)
      r.animate([{ transform: 'scale(.3)', opacity: 1 }, { transform: 'scale(3.4)', opacity: 0 }], { duration: 750, easing: 'cubic-bezier(.2,.7,.2,1)' }).onfinish = () => r.remove()
    }, true)
    addEventListener('pointerup', () => svg.animate([{ transform: 'scale(.82)' }, { transform: 'scale(1)' }], { duration: 160, fill: 'forwards', easing: 'ease-out' }), true)
  }
  if (document.body) boot(); else addEventListener('DOMContentLoaded', boot)
})()`

// hide the app's own navigation chrome so frames show only the product
export const hideChromeCss = `
  div[style*="z-index: 9999"] { display: none !important; }      /* mode switcher pill */
  div[style*="bottom: 22px"] { display: none !important; }       /* 3D player hint dock */
  .corner-menus { display: none !important; }                    /* companion corner menus */
  * { cursor: none !important; }
`

/** Fake logged-in session + fake track whose clock starts at offsetMs (see capture-hype for notes). */
export async function installFakes(ctx, offsetMs) {
  const clock0 = Date.now()
  await ctx.addInitScript(() => {
    localStorage.setItem('vf_tokens', JSON.stringify({ access_token: 'sample', refresh_token: 'sample', expires_in: 3600, token_type: 'Bearer' }))
    localStorage.setItem('vf_token_expiry', String(Date.now() + 3600 * 1000))
    localStorage.setItem('vf_scope_version', '2')
  })
  const json = (route, body, status = 200) =>
    route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) })
  // Playwright matches the most recently registered route first: catch-all goes first
  await ctx.route('https://api.spotify.com/v1/me/player/**', (route) => route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' } }))
  await ctx.route('https://api.spotify.com/v1/me/player/currently-playing', (route) =>
    json(route, {
      is_playing: true,
      progress_ms: offsetMs + (Date.now() - clock0),
      currently_playing_type: 'track',
      item: {
        id: 'sample-1',
        uri: 'sample:1',
        name: 'Neon Drift',
        duration_ms: 200000,
        artists: [{ id: 'a1', name: 'Sample Artist' }],
        album: { id: 'al1', name: 'Sample Album', images: [{ url: ART_URL, height: 640, width: 640 }, { url: ART_URL, height: 300, width: 300 }] }
      }
    })
  )
  await ctx.route('https://api.spotify.com/v1/me/player', (route) => json(route, { device: { volume_percent: 60 }, is_playing: true }))
  await ctx.route('https://lrclib.net/api/get**', (route) => json(route, { syncedLyrics: lrc }))
  await ctx.route(ART_URL, (route) => route.fulfill({ status: 200, contentType: 'image/png', headers: { 'access-control-allow-origin': '*' }, body: ART }))
}

export async function openPage({ offsetMs = 0 } = {}) {
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--hide-scrollbars', '--mute-audio']
  })
  const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: DSF })
  await ctx.addInitScript(seedScript)
  await ctx.addInitScript(cursorScript)
  await installFakes(ctx, offsetMs)
  const page = await ctx.newPage()
  await page.goto(URL, { waitUntil: 'networkidle' })
  return { browser, ctx, page }
}

/** Switch app mode via the header (done BEFORE recording), then hide the chrome. */
export async function chooseMode(page, mode) {
  if (mode === 'companion') await page.getByRole('button', { name: /Spotify Companion/ }).click()
  else if (mode) {
    await page.getByRole('button', { name: /Lyric Visuals/ }).click()
    await page.getByRole('menuitem', { name: new RegExp(mode) }).click()
  }
  await page.addStyleTag({ content: hideChromeCss })
}

/** Record frames with the CDP screencast. Returns a stop() that writes times.json. */
export async function startRecording(ctx, page, dir) {
  fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(dir, { recursive: true })
  const cdp = await ctx.newCDPSession(page)
  const frames = []
  let n = 0
  cdp.on('Page.screencastFrame', (f) => {
    const file = `${String(n).padStart(5, '0')}.jpg`
    fs.writeFileSync(path.join(dir, file), Buffer.from(f.data, 'base64'))
    frames.push({ file, t: f.metadata.timestamp })
    n++
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {})
  })
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: JPEG_Q, maxWidth: OUT_W, maxHeight: OUT_H, everyNthFrame: 1 })
  return async () => {
    await cdp.send('Page.stopScreencast')
    await sleep(250)
    fs.writeFileSync(path.join(dir, 'times.json'), JSON.stringify(frames))
    const span = frames[frames.length - 1].t - frames[0].t
    console.log(`  ${path.basename(dir)}: ${frames.length} frames over ${span.toFixed(1)}s (~${(frames.length / span).toFixed(1)} fps)`)
  }
}

/** Move the visible cursor with an ease-in-out curve. */
export async function moveTo(page, from, to, ms) {
  const steps = Math.max(10, Math.round(ms / 16))
  for (let i = 0; i <= steps; i++) {
    const k = i / steps
    const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2
    await page.mouse.move(from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e)
    await sleep(ms / steps)
  }
}

export async function click(page) {
  await page.mouse.down()
  await sleep(90)
  await page.mouse.up()
}

/** Pick a companion background scene through the real corner menu (done before recording, hidden after). */
export async function chooseScene(page, id) {
  await page.locator('#bg-picker-toggle').click()
  await page.locator(`#bg-item-${id}`).click()
  await sleep(1500) // scene crossfade
}

/** Glide the visible cursor in-page (smooth, independent of CDP latency), then place the real pointer there. */
export async function glide(page, from, to, ms) {
  await page.evaluate(([a, b, c, d, m]) => window.__glide(a, b, c, d, m), [from[0], from[1], to[0], to[1], ms])
  await page.mouse.move(to[0], to[1])
}

/** Drag with only a handful of real mouse events (OrbitControls damping smooths the rest). */
export async function dragSparse(page, from, to, ms, steps = 14) {
  await page.mouse.move(from[0], from[1])
  await page.mouse.down()
  for (let i = 1; i <= steps; i++) {
    const k = i / steps
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2
    await page.mouse.move(from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e)
    await sleep(ms / steps)
  }
  await page.mouse.up()
}
