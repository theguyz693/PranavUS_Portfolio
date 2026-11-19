// Repeatable capture of the VibeFlow visuals with CLEARLY FAKE data (no real Spotify account).
// The app thinks it is logged in: we seed fake tokens in localStorage and answer the Spotify,
// LRCLIB and cover-art requests inside the browser (Playwright routes). Nothing in the repo changes.
//
//   node capture.mjs [ipod|disc|reel|screens|editorial]   -> frames/<name>/*.jpg + times.json
//
// Each shot uses a fresh browser context; Math.random is seeded so "random" entrances repeat.
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'

const URL = process.env.APP_URL || 'http://127.0.0.1:5173/'
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const OUT = path.resolve('frames')
const ART = fs.readFileSync(path.resolve('art.png'))
const W = 1280
const H = 720
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const seedScript = `(() => { let a = 1337; Math.random = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } })()`

// fake, made-up lyrics (same lines as the app's built-in demo)
const LYRICS = [
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
const DURATION_MS = 200000

/** Fake logged-in Spotify session + fake track whose clock starts at `offsetMs`. */
async function installFakes(ctx, offsetMs) {
  const clock0 = Date.now()
  await ctx.addInitScript(() => {
    localStorage.setItem('vf_tokens', JSON.stringify({ access_token: 'sample', refresh_token: 'sample', expires_in: 3600, token_type: 'Bearer' }))
    localStorage.setItem('vf_token_expiry', String(Date.now() + 3600 * 1000))
    localStorage.setItem('vf_scope_version', '2')
  })
  const json = (route, body, status = 200) =>
    route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) })
  // Playwright matches the most recently registered route first, so the catch-all goes first
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
        duration_ms: DURATION_MS,
        artists: [{ id: 'a1', name: 'Sample Artist' }],
        album: { id: 'al1', name: 'Sample Album', images: [{ url: ART_URL, height: 640, width: 640 }, { url: ART_URL, height: 300, width: 300 }] }
      }
    })
  )
  await ctx.route('https://api.spotify.com/v1/me/player', (route) => json(route, { device: { volume_percent: 60 }, is_playing: true }))
  await ctx.route('https://lrclib.net/api/get**', (route) => json(route, { syncedLyrics: lrc }))
  await ctx.route(ART_URL, (route) => route.fulfill({ status: 200, contentType: 'image/png', headers: { 'access-control-allow-origin': '*' }, body: ART }))
}

async function capture(name, { visual = null, seconds, offsetMs = 0, settleMs = 0, script }) {
  const dir = path.join(OUT, name)
  fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(dir, { recursive: true })

  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--hide-scrollbars', '--mute-audio']
  })
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })
  await ctx.addInitScript(seedScript)
  await installFakes(ctx, offsetMs)
  const page = await ctx.newPage()
  await page.goto(URL, { waitUntil: 'networkidle' })

  if (visual) {
    await page.getByRole('button', { name: /Lyric Visuals/ }).click()
    await page.getByRole('menuitem', { name: new RegExp(visual) }).click()
  }
  await page.mouse.move(W - 4, H - 4)
  if (settleMs) await sleep(settleMs) // let the track, cover art and textures load before recording
  if (visual === null) {
    // 3D player: dolly in (scroll) so it fills the frame
    await page.mouse.move(W / 2, H / 2)
    await sleep(300)
  }

  const cdp = await ctx.newCDPSession(page)
  const frames = []
  let n = 0
  cdp.on('Page.screencastFrame', async (f) => {
    const file = `${String(n).padStart(5, '0')}.jpg`
    fs.writeFileSync(path.join(dir, file), Buffer.from(f.data, 'base64'))
    frames.push({ file, t: f.metadata.timestamp })
    n++
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {})
  })
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: W, maxHeight: H, everyNthFrame: 1 })
  const t0 = Date.now()
  if (script) await script(page)
  const remaining = seconds * 1000 - (Date.now() - t0)
  if (remaining > 0) await sleep(remaining)
  await cdp.send('Page.stopScreencast')
  await sleep(200)
  fs.writeFileSync(path.join(dir, 'times.json'), JSON.stringify(frames))
  const span = frames[frames.length - 1].t - frames[0].t
  console.log(`${name}: ${frames.length} frames over ${span.toFixed(1)}s (~${(frames.length / span).toFixed(1)} fps)`)
  await browser.close()
}

/** Drag across the canvas to orbit the 3D model. */
async function drag(page, from, to, ms) {
  const steps = Math.max(8, Math.round(ms / 25))
  await page.mouse.move(from[0], from[1])
  await page.mouse.down()
  for (let i = 1; i <= steps; i++) {
    const k = i / steps
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2 // ease in-out
    await page.mouse.move(from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e)
    await sleep(ms / steps)
  }
  await page.mouse.up()
}

fs.mkdirSync(OUT, { recursive: true })
const only = process.argv[2]
const jobs = {
  ipod: () =>
    capture('ipod', {
      seconds: 10,
      offsetMs: 2500,
      settleMs: 3500,
      script: async (page) => {
        await sleep(300)
        for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, -100); await sleep(120) } // gentle dolly-in
        await drag(page, [690, 340], [610, 325], 2300) // orbit the player so the 3D shows
        await sleep(500)
        await page.locator('button', { hasText: 'MENU' }).click() // MENU = switch the LCD to synced lyrics
        await sleep(1800)
        await drag(page, [610, 325], [665, 335], 1800)
      }
    }),
  disc: () => capture('disc', { visual: 'Disc Reel', seconds: 17, settleMs: 0 }),
  reel: () => capture('reel', { visual: 'Reel 3D', seconds: 17 }),
  screens: () => capture('screens', { visual: 'Floating Screens', seconds: 17 }),
  // start the fake clock near the chorus so it arrives within a few seconds
  editorial: () => capture('editorial', { visual: 'Editorial', seconds: 11, offsetMs: 9000 })
}
for (const [k, fn] of Object.entries(jobs)) if (!only || only === k) await fn()
