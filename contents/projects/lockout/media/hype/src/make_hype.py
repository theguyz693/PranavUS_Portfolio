r"""Renders the Lockout hype ad: 1920x1200, 30 fps, silent, loops cleanly.

Re-run end to end (from this folder):
    pip install playwright imageio-ffmpeg pillow numpy     # Chrome must be installed (uses channel='chrome')
    python make_hype.py                    # full render -> ../demo-loop.mp4, ../demo-loop.webm, ../poster.jpg
    python make_hype.py --preview 1.0 2.6 5.0   # just save PNG previews of those timestamps to ./preview

How it works
- Copies the project (read-only, nothing in it is modified) to a temp site and serves it locally.
- ad.html is the ad: every visual is a pure function of time, render(t).
- The real popup, floating counter and Shorts-hiding CSS run inside it with staged sample data
  (shim.js fakes chrome.storage and the clock; the project's own code is untouched).
- Each frame is rendered at an exact timestamp and screenshotted, then encoded with ffmpeg.
"""
import argparse, http.server, shutil, socketserver, subprocess, sys, tempfile, threading
from pathlib import Path

import imageio_ffmpeg
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
OUT = HERE.parent
PROJECT = Path(r'C:\lockout')          # the Lockout repo (read only)
FPS = 30
DURATION = 14.4
W, H = 1920, 1200
POSTER_T = 2.70                        # best single frame: Shorts cards mid-flight, caption and badge on screen
MAX_BYTES = 6_000_000
PORT = 8791

ap = argparse.ArgumentParser()
ap.add_argument('--preview', nargs='*', type=float, help='timestamps (s) to save as PNG previews and stop')
args = ap.parse_args()

work = Path(tempfile.mkdtemp(prefix='lockout_hype_'))
site = work / 'site'
shutil.copytree(PROJECT, site, ignore=shutil.ignore_patterns('.git', 'dist', 'store', 'scripts', 'demo', '.claude', '*.zip'))
(site / 'ad').mkdir()
for name in ('ad.html', 'shim.js', 'ad-article.html'):
    shutil.copy(HERE / name, site / 'ad' / name)
shutil.copytree(HERE / 'fonts', site / 'ad' / 'fonts')
frames_dir = work / 'frames'
frames_dir.mkdir()
preview_dir = HERE / 'preview'


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=str(site), **k)

    def log_message(self, *a):
        pass

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


socketserver.TCPServer.allow_reuse_address = True
httpd = socketserver.ThreadingTCPServer(('127.0.0.1', PORT), Handler)
threading.Thread(target=httpd.serve_forever, daemon=True).start()

shim = (HERE / 'shim.js').read_text(encoding='utf-8')
n_frames = round(DURATION * FPS)
wanted = {round(t * FPS) for t in (args.preview or [])}

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True, args=['--hide-scrollbars', '--force-color-profile=srgb'])
    ctx = browser.new_context(viewport={'width': W, 'height': H}, device_scale_factor=1)
    ctx.add_init_script(shim)
    page = ctx.new_page()
    page.on('pageerror', lambda e: print('pageerror:', e))
    page.on('console', lambda m: print('console:', m.text) if m.type == 'error' else None)
    page.goto(f'http://127.0.0.1:{PORT}/ad/ad.html')
    page.evaluate('boot()')

    for i in range(n_frames):
        t = i / FPS
        page.evaluate(f'renderAt({t})')
        page.wait_for_timeout(45)                      # let async UI updates from this frame's actions land
        page.evaluate(f'syncAnims({t})')
        page.evaluate('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))')
        if args.preview is not None and i not in wanted:
            continue
        if args.preview is not None:
            preview_dir.mkdir(exist_ok=True)
            page.screenshot(path=str(preview_dir / f'p_{t:05.2f}.png'))
        else:
            page.screenshot(path=str(frames_dir / f'f{i:06d}.jpg'), type='jpeg', quality=95)
            if i % 60 == 0:
                print(f'frame {i}/{n_frames}', flush=True)
    browser.close()
httpd.shutdown()

if args.preview is not None:
    print('previews saved to', preview_dir)
    shutil.rmtree(work, ignore_errors=True)
    sys.exit(0)

# ---------------- encode ----------------
ff = imageio_ffmpeg.get_ffmpeg_exe()


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stderr[-1800:])
        sys.exit('ffmpeg failed')


src = ['-framerate', str(FPS), '-i', str(frames_dir / 'f%06d.jpg'),
       '-vf', 'scale=in_range=full:out_range=limited:flags=lanczos,format=yuv420p']   # standard limited range for wide player support
mp4 = OUT / 'demo-loop.mp4'
for crf in (20, 22, 24, 26, 28, 30):
    run([ff, '-y', *src, '-an', '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'veryslow', '-crf', str(crf),
         '-maxrate', '3800k', '-bufsize', '7600k', '-pix_fmt', 'yuv420p', '-r', str(FPS), '-movflags', '+faststart', str(mp4)])
    if mp4.stat().st_size < MAX_BYTES * 0.93:
        break
webm = OUT / 'demo-loop.webm'
for crf in (28, 30, 32, 34, 36, 38):
    run([ff, '-y', *src, '-an', '-c:v', 'libvpx-vp9', '-b:v', '3500k', '-crf', str(crf), '-deadline', 'good', '-cpu-used', '1',
         '-row-mt', '1', '-pix_fmt', 'yuv420p', '-r', str(FPS), str(webm)])
    if webm.stat().st_size < MAX_BYTES * 0.93:
        break
shutil.copy(frames_dir / f'f{round(POSTER_T * FPS):06d}.jpg', OUT / 'poster.jpg')
shutil.rmtree(work, ignore_errors=True)
for f in ('demo-loop.mp4', 'demo-loop.webm', 'poster.jpg'):
    print(f'{f}: {(OUT / f).stat().st_size / 1024 / 1024:.2f} MB')
