// Encodes captured JPEG frames into demo-loop.mp4 (H.264) and demo-loop.webm (VP9) at a constant
// 30 fps using headless Chrome's WebCodecs + mp4-muxer/webm-muxer. No audio track.
// Also writes poster.jpg (a chosen frame) and reports container duration and size.
//
// Usage: node ad-encode.mjs <framesDir> <outDir> [posterFrame]
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const FRAMES = path.resolve(process.argv[2] || 'ad-frames');
const OUT = path.resolve(process.argv[3] || 'ad-final');
const POSTER = Number(process.argv[4] ?? 318);
const FPS = 30;
fs.mkdirSync(OUT, { recursive: true });
const n = fs.readdirSync(FRAMES).filter((f) => /^f\d{4}\.jpg$/.test(f)).length;
const nm = path.resolve('node_modules');

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (req.method === 'POST' && u.pathname === '/save') {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      fs.writeFileSync(path.join(OUT, path.basename(u.searchParams.get('name'))), Buffer.concat(chunks));
      res.writeHead(200).end('ok');
    });
    return;
  }
  const map = {
    '/': ['text/html', Buffer.from('<!doctype html><meta charset="utf-8"><body>encoder</body>')],
  };
  if (map[u.pathname]) return res.writeHead(200, { 'Content-Type': map[u.pathname][0] }).end(map[u.pathname][1]);
  let file = null;
  if (u.pathname.startsWith('/frames/')) file = path.join(FRAMES, path.basename(u.pathname));
  if (u.pathname === '/mp4-muxer.mjs') file = path.join(nm, 'mp4-muxer/build/mp4-muxer.mjs');
  if (u.pathname === '/webm-muxer.mjs') file = path.join(nm, 'webm-muxer/build/webm-muxer.mjs');
  if (!file || !fs.existsSync(file)) return res.writeHead(404).end();
  res.writeHead(200, { 'Content-Type': file.endsWith('.mjs') ? 'text/javascript' : 'image/jpeg' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
await page.goto(base + '/');
const report = await page.evaluate(
  async ({ n, fps }) => {
    const { Muxer: Mp4Muxer, ArrayBufferTarget: Mp4Target } = await import('/mp4-muxer.mjs');
    const { Muxer: WebmMuxer, ArrayBufferTarget: WebmTarget } = await import('/webm-muxer.mjs');
    const W = 1920, H = 1200;

    const pickConfig = async (codecs, extra) => {
      for (const codec of codecs) {
        const cfg = { codec, width: W, height: H, framerate: fps, ...extra };
        const r = await VideoEncoder.isConfigSupported(cfg).catch(() => ({ supported: false }));
        if (r.supported) return cfg;
      }
      return null;
    };
    const avc = await pickConfig(['avc1.640033', 'avc1.640032', 'avc1.4d0033', 'avc1.42e033'], { bitrate: 3_400_000, avc: { format: 'avc' }, latencyMode: 'quality' });
    const vp9 = await pickConfig(['vp09.00.41.08', 'vp09.00.40.08', 'vp09.00.50.08'], { bitrate: 2_800_000, latencyMode: 'quality' });
    if (!avc || !vp9) return { error: `no encoder: avc=${!!avc} vp9=${!!vp9}` };

    const mp4 = new Mp4Muxer({ target: new Mp4Target(), video: { codec: 'avc', width: W, height: H, frameRate: fps }, fastStart: 'in-memory' });
    const webm = new WebmMuxer({ target: new WebmTarget(), video: { codec: 'V_VP9', width: W, height: H, frameRate: fps } });
    let err = null;
    const e1 = new VideoEncoder({ output: (c, m) => mp4.addVideoChunk(c, m), error: (e) => (err = e) });
    const e2 = new VideoEncoder({ output: (c, m) => webm.addVideoChunk(c, m), error: (e) => (err = e) });
    e1.configure(avc);
    e2.configure(vp9);

    for (let i = 0; i < n; i++) {
      const blob = await (await fetch(`/frames/f${String(i).padStart(4, '0')}.jpg`)).blob();
      const bmp = await createImageBitmap(blob, { resizeWidth: W, resizeHeight: H, resizeQuality: 'high' });
      const vf = new VideoFrame(bmp, { timestamp: Math.round((i * 1e6) / fps), duration: Math.round(1e6 / fps) });
      const keyFrame = i % 60 === 0;
      e1.encode(vf, { keyFrame });
      e2.encode(vf, { keyFrame });
      vf.close();
      bmp.close();
      while (e1.encodeQueueSize > 8 || e2.encodeQueueSize > 8) await new Promise((r) => setTimeout(r, 10));
      if (err) return { error: String(err) };
    }
    await e1.flush();
    await e2.flush();
    mp4.finalize();
    webm.finalize();
    const save = (name, buf) => fetch(`/save?name=${name}`, { method: 'POST', body: buf });
    await save('demo-loop.mp4', mp4.target.buffer);
    await save('demo-loop.webm', webm.target.buffer);

    // Decode check: real durations as the browser sees them.
    const durationOf = (buf, type) =>
      new Promise((r) => {
        const v = document.createElement('video');
        v.muted = true;
        v.onloadedmetadata = () => r({ duration: v.duration, w: v.videoWidth, h: v.videoHeight });
        v.onerror = () => r({ error: 'decode failed' });
        v.src = URL.createObjectURL(new Blob([buf], { type }));
      });
    return {
      avc: avc.codec,
      vp9: vp9.codec,
      mp4: await durationOf(mp4.target.buffer, 'video/mp4'),
      webm: await durationOf(webm.target.buffer, 'video/webm'),
    };
  },
  { n, fps: FPS },
);
await browser.close();
server.close();
if (report.error) throw new Error(report.error);

// Container-level duration of the MP4 (mvhd box), like ffprobe's format duration.
const mp4buf = fs.readFileSync(path.join(OUT, 'demo-loop.mp4'));
const at = mp4buf.indexOf(Buffer.from('mvhd'));
const v1 = mp4buf[at + 4] === 1;
const timescale = mp4buf.readUInt32BE(at + (v1 ? 24 : 16));
const dur = v1 ? Number(mp4buf.readBigUInt64BE(at + 28)) : mp4buf.readUInt32BE(at + 20);
fs.copyFileSync(path.join(FRAMES, `f${String(POSTER).padStart(4, '0')}.jpg`), path.join(OUT, 'poster.jpg'));
const size = (f) => (fs.statSync(path.join(OUT, f)).size / 1024 / 1024).toFixed(2) + ' MB';
console.log(JSON.stringify({
  frames: n,
  codecs: [report.avc, report.vp9],
  mp4: { ...report.mp4, mvhdSeconds: dur / timescale, size: size('demo-loop.mp4') },
  webm: { ...report.webm, size: size('demo-loop.webm') },
  poster: `frame ${POSTER}`,
}, null, 1));
