// Step 2 of the Cadence hype video: render compose.html at 30 fps and encode.
//   node render.mjs            (after capture.mjs)
// Writes ../media/hype/demo-loop.mp4, demo-loop.webm and poster.jpg.
import { chromium } from 'file:///C:/cadence/tools/demo-video/node_modules/playwright-core/index.mjs';
import { execSync, spawnSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '..', 'media', 'hype');
const FRAMES = path.join(HERE, 'frames');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const FFMPEG = process.env.FFMPEG || execSync('python -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"').toString().trim();
const FPS = 30, DURATION = 12.0, POSTER_T = Number(process.env.POSTER_T || 7.85);
const POSTER_ONLY = process.env.POSTER_ONLY === '1'; // re-export poster.jpg without re-rendering the video

if (!POSTER_ONLY) {
  fs.rmSync(FRAMES, { recursive: true, force: true });
  fs.mkdirSync(FRAMES, { recursive: true });
}
fs.mkdirSync(OUT, { recursive: true });

// Serve this folder over localhost so the page can fetch the manifest.
const types = { '.html': 'text/html', '.json': 'application/json', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  const file = path.join(HERE, decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(HERE) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1200 } });
await page.goto(`http://localhost:${port}/compose.html`, { waitUntil: 'networkidle' });
await page.evaluate(() => window.ready);

const total = Math.round(FPS * DURATION);
for (let i = 0; i < (POSTER_ONLY ? 0 : total); i++) {
  await page.evaluate(t => window.renderAt(t), i / FPS);
  await page.screenshot({ path: path.join(FRAMES, `f${String(i).padStart(4, '0')}.png`), type: 'png' });
}
await page.evaluate(t => window.renderAt(t), POSTER_T);
await page.screenshot({ path: path.join(OUT, 'poster.jpg'), type: 'jpeg', quality: 90 });
await browser.close();
server.close();
if (POSTER_ONLY) { console.log('poster only'); process.exit(0); }

const run = args => { const r = spawnSync(FFMPEG, ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' }); if (r.status) throw new Error('ffmpeg failed'); };
const input = ['-framerate', String(FPS), '-i', path.join(FRAMES, 'f%04d.png')];
const mp4 = path.join(OUT, 'demo-loop.mp4'), webm = path.join(OUT, 'demo-loop.webm');
run([...input, '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', process.env.CRF || '20', '-pix_fmt', 'yuv420p', '-color_range', 'tv', '-movflags', '+faststart', mp4]);
run([...input, '-an', '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', process.env.VP9CRF || '32', '-pix_fmt', 'yuv420p', '-row-mt', '1', '-deadline', 'good', webm]);
console.log(JSON.stringify({ frames: total, mp4: fs.statSync(mp4).size, webm: fs.statSync(webm).size }));
