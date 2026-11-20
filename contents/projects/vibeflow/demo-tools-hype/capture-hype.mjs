// Step 1 of the VibeFlow hype video: record the four hero shots at 1920x1200 with staged sample data.
//   node capture-hype.mjs [ipod|screens|companion|editorial]
// Needs the app running at APP_URL (default http://127.0.0.1:5173). Output: frames/<shot>/*.jpg + times.json
import path from 'node:path'
import { openPage, chooseMode, chooseScene, startRecording, glide, dragSparse, click, sleep, VW, VH } from './lib.mjs'

const FRAMES = path.resolve('frames')

async function shot(name, { mode, offsetMs = 0, settleMs = 1500, seconds, scene, script }) {
  console.log(`recording ${name} ...`)
  const { browser, ctx, page } = await openPage({ offsetMs })
  if (mode === 'companion') {
    await page.getByRole('button', { name: /Spotify Companion/ }).click()
    await sleep(1200)
    if (scene) await chooseScene(page, scene)
  }
  await chooseMode(page, mode === 'companion' ? undefined : mode) // hides the app's own menus
  await page.mouse.move(VW - 2, VH - 2)
  await sleep(settleMs) // track, cover art and textures load before the camera rolls
  const stop = await startRecording(ctx, page, path.join(FRAMES, name))
  const t0 = Date.now()
  if (script) await script(page)
  const rest = seconds * 1000 - (Date.now() - t0)
  if (rest > 0) await sleep(rest)
  await stop()
  await browser.close()
}

const jobs = {
  // the 3D player: cursor glides to the click wheel, presses MENU, the screen flips to synced lyrics, slow orbit
  ipod: () =>
    shot('ipod', {
      mode: null,
      offsetMs: 6000,
      settleMs: 3500,
      seconds: 9,
      script: async (page) => {
        await sleep(500)
        await page.mouse.move(1010, 250)
        await glide(page, [1010, 250], [640, 447], 1100) // glide onto MENU
        await sleep(280)
        await click(page) // MENU
        await sleep(1500)
        await dragSparse(page, [760, 330], [700, 322], 2200) // gentle orbit so the 3D reads
      }
    }),
  // the original "glowing boxes": camera flies from lyric box to lyric box
  screens: () => shot('screens', { mode: 'Floating Screens', seconds: 12, settleMs: 300 }),
  // the old companion page: cover art, now-playing card, scrolling lyrics
  companion: () => shot('companion', { mode: 'companion', offsetMs: 7000, seconds: 8, settleMs: 1800 }),
  // disc on the left, lyrics on the right; the clock starts near the chorus so it arrives quickly
  editorial: () => shot('editorial', { mode: 'Editorial', offsetMs: 9000, seconds: 10, settleMs: 800 })
}
const only = process.argv[2]
for (const [k, fn] of Object.entries(jobs)) if (!only || only === k) await fn()
