// Step 3: render caption cards + the end card as transparent 1920x1200 PNGs, using Anton from @fontsource/anton.
//   node captions.mjs   -> overlays/*.png
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'

const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const CREAM = '#e9e3d8'
const GOLD = '#d8b878'
const font = fs.readFileSync(path.resolve('node_modules/@fontsource/anton/files/anton-latin-400-normal.woff2')).toString('base64')

export const CAPTIONS = {
  cap1: 'Your music.<br>In 3D.',
  cap2: 'Lyrics<br>in motion.',
  cap3: 'Scenes<br>that breathe.',
  cap4: 'Sing<br>along.'
}

const base = `
@font-face { font-family: 'Anton'; src: url(data:font/woff2;base64,${font}) format('woff2'); }
html, body { margin: 0; width: 1920px; height: 1200px; background: transparent; overflow: hidden; }
.cap { position: absolute; left: 112px; top: 96px; font-family: 'Anton', Impact, sans-serif; font-size: 104px; line-height: 1.04;
  letter-spacing: 1px; text-transform: uppercase; color: ${CREAM}; text-shadow: 0 6px 34px rgba(0,0,0,.65), 0 0 2px rgba(0,0,0,.4); }
.end { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.end h1 { margin: 0; font-family: 'Anton', Impact, sans-serif; font-weight: 400; font-size: 270px; letter-spacing: 14px; color: ${CREAM}; line-height: 1; }
.end i { display: block; width: 230px; height: 6px; margin-top: 46px; background: ${GOLD}; border-radius: 3px; }
`

fs.mkdirSync('overlays', { recursive: true })
const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const page = await browser.newPage({ viewport: { width: 1920, height: 1200 }, deviceScaleFactor: 1 })
async function render(name, html) {
  await page.setContent(`<style>${base}</style>${html}`)
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: `overlays/${name}.png`, omitBackground: true })
  console.log('  overlays/' + name + '.png')
}
for (const [k, text] of Object.entries(CAPTIONS)) await render(k, `<div class="cap">${text}</div>`)
await render('end', `<div class="end"><h1>VIBEFLOW</h1><i></i></div>`)
await browser.close()
