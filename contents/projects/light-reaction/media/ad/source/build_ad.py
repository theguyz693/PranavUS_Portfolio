"""
Re-run end to end:   python build_ad.py [--frames DIR] [--preview]
Starts the server, renders 60 fps frames with Playwright, encodes with ffmpeg
(imageio-ffmpeg's bundled binary), writes demo-loop.mp4 / demo-loop.webm / poster.jpg to ..\\
Needs: playwright (+ chromium), imageio-ffmpeg, av, aiohttp/bleak/mss/Pillow (project deps).
"""
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import time

import imageio_ffmpeg
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(os.path.join(HERE, ".."))
STUB = os.path.join(HERE, "ad_stub.js")
PORT, FPS_R, DUR = 5058, 60, 12.0
args = sys.argv[1:]
FRAMES = args[args.index("--frames") + 1] if "--frames" in args else os.path.join(tempfile.gettempdir(), "lr_ad_frames")
PREVIEW = "--preview" in args
FF = imageio_ffmpeg.get_ffmpeg_exe()

shutil.rmtree(FRAMES, ignore_errors=True)
os.makedirs(FRAMES)

env = dict(os.environ, PYTHONDONTWRITEBYTECODE="1")
srv = subprocess.Popen([sys.executable, os.path.join(HERE, "ad_server.py")], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    for _ in range(60):
        try:
            socket.create_connection(("127.0.0.1", PORT), 0.5).close()
            break
        except OSError:
            time.sleep(0.25)

    times = [i / FPS_R for i in range(int(DUR * FPS_R))]
    if PREVIEW:
        times = [0, 1.0, 2.0, 3.5, 5.0, 6.5, 7.0, 7.6, 8.3, 9.0, 9.6, 10.6, 11.9]
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={"width": 1920, "height": 1200}, device_scale_factor=1)
        ctx.add_init_script(path=STUB)
        page = ctx.new_page()
        page.goto(f"http://127.0.0.1:{PORT}/ad")
        info = page.evaluate("initAd()")
        print("ready:", {k: info[k] for k in ("P1", "winCss")}, flush=True)
        t_start = time.time()
        for n, t in enumerate(times):
            page.evaluate(f"seek({t})")
            name = f"p_{t:05.2f}.jpg" if PREVIEW else f"f{n:04d}.jpg"
            page.screenshot(path=os.path.join(FRAMES, name), type="jpeg", quality=93)
            if n % 120 == 0:
                print(f"frame {n}/{len(times)}  {time.time()-t_start:.0f}s", flush=True)
        b.close()
finally:
    srv.terminate()

if PREVIEW:
    print("preview frames in", FRAMES)
    sys.exit(0)

# 60 fps frames -> 2-frame blend (light motion blur) -> 30 fps
vf = "tmix=frames=2:weights='1 1',fps=30,format=yuv420p"
src = ["-framerate", str(FPS_R), "-i", os.path.join(FRAMES, "f%04d.jpg")]
common = [FF, "-y", "-hide_banner", "-loglevel", "error"] + src + ["-an", "-vf", vf]
subprocess.run(common + ["-c:v", "libx264", "-preset", "slow", "-crf", "23", "-maxrate", "4M", "-bufsize", "8M",
                         "-movflags", "+faststart", os.path.join(OUT, "demo-loop.mp4")], check=True)
subprocess.run(common + ["-c:v", "libvpx-vp9", "-crf", "34", "-b:v", "3500k", "-row-mt", "1",
                         os.path.join(OUT, "demo-loop.webm")], check=True)
poster_src = os.path.join(FRAMES, f"f{int(5.0 * FPS_R):04d}.jpg")
shutil.copy(poster_src, os.path.join(OUT, "poster.jpg"))

import av
for f in ("demo-loop.mp4", "demo-loop.webm"):
    path = os.path.join(OUT, f)
    c = av.open(path)
    v = c.streams.video[0]
    print(f, v.codec_context.name, f"{v.width}x{v.height}", float(v.average_rate), "fps",
          "audio streams:", len(c.streams.audio), "duration %.2fs" % (c.duration / 1e6),
          "size %.2f MB" % (os.path.getsize(path) / 1e6))
