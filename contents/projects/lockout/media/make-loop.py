r"""Builds the portfolio loop for Lockout from the scripted 77 s demo render.

Source: C:\lockout\demo\lockout-demo.mp4 (sample data, generic mock sites, silent)
Output (next to this script): demo-loop.mp4, demo-loop.webm, poster.jpg

Run:  python make-loop.py        (needs: pip install imageio-ffmpeg)
Change SHOTS to re-cut. Each shot is (start_s, end_s, speed).
"""
import subprocess, sys, tempfile
from pathlib import Path

import imageio_ffmpeg

SOURCE = Path(r'C:\lockout\demo\lockout-demo.mp4')
OUT = Path(__file__).resolve().parent
FF = imageio_ffmpeg.get_ffmpeg_exe()

WIDTH = 1280
FPS = 24
SEAM = 0.6            # crossfade from the end of the clip back into its start, so the loop is seamless
MAX_BYTES = 2_000_000
POSTER_AT = 1.6       # seconds into the final clip (Monk selected: popup and caption agree)

SHOTS = [
    (15.2, 24.8, 3.2),   # 1. pick a lock-in level (Chill -> Focused -> Locked In -> Monk -> Locked In)
    (29.7, 35.4, 1.9),   # 2. try to quit: typed pledge + countdown
    (38.4, 41.4, 1.0),   # 3. calm block page with streak and time left
    (44.0, 47.0, 1.0),   # 4. Shorts shelf and tab disappear
    (51.0, 56.4, 1.55),  # 5. Alt+Shift+L pops the floating counter, numbers tick up
]

# Crop the source's 3 px progress bar at the bottom, then scale to 1280 wide (full -> limited range for H.264)
LOOK = f'crop=1920:1072:0:0,scale={WIDTH}:-2:flags=lanczos:in_range=full:out_range=limited,setsar=1,format=yuv420p'


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stderr[-2000:])
        sys.exit(f'ffmpeg failed: {" ".join(cmd[:6])} ...')
    return r


def duration(path):
    r = subprocess.run([FF, '-hide_banner', '-i', str(path)], capture_output=True, text=True)
    for line in r.stderr.splitlines():
        if 'Duration:' in line:
            h, m, s = line.split('Duration:')[1].split(',')[0].strip().split(':')
            return int(h) * 3600 + int(m) * 60 + float(s)
    raise RuntimeError('no duration')


with tempfile.TemporaryDirectory() as tmp:
    tmp = Path(tmp)

    # 1) Cut the shots, speed them up, join with hard cuts -> lossless-ish intermediate at the target fps
    parts = []
    for i, (a, b, speed) in enumerate(SHOTS):
        parts.append(f'[0:v]trim=start={a}:end={b},setpts=(PTS-STARTPTS)/{speed},fps={FPS}[v{i}]')
    concat = ''.join(f'[v{i}]' for i in range(len(SHOTS))) + f'concat=n={len(SHOTS)}:v=1:a=0,{LOOK}[a]'
    seq = tmp / 'seq.mp4'
    run([FF, '-y', '-i', str(SOURCE), '-filter_complex', ';'.join(parts + [concat]), '-map', '[a]',
         '-an', '-c:v', 'libx264', '-crf', '8', '-preset', 'fast', str(seq)])
    total = duration(seq)

    # 2) Loop seam: [middle] + crossfade(tail -> head). Last frame then leads straight into the first.
    mid_start, mid_end = SEAM, total - SEAM
    graph = (
        f'[0:v]trim=start={mid_start}:end={mid_end},setpts=PTS-STARTPTS[mid];'
        f'[0:v]trim=start={mid_end}:end={total},setpts=PTS-STARTPTS,fps={FPS},settb=AVTB[tail];'
        f'[0:v]trim=start=0:end={SEAM},setpts=PTS-STARTPTS,fps={FPS},settb=AVTB[head];'
        f'[tail][head]xfade=transition=fade:duration={SEAM - 0.1}:offset=0.05,fps={FPS}[seam];'
        f'[mid]fps={FPS},settb=AVTB[midn];'
        f'[midn][seam]concat=n=2:v=1:a=0[out]'
    )
    loop = tmp / 'loop.mp4'
    run([FF, '-y', '-i', str(seq), '-filter_complex', graph, '-map', '[out]', '-an',
         '-c:v', 'libx264', '-crf', '8', '-preset', 'fast', '-pix_fmt', 'yuv420p', str(loop)])
    final_len = duration(loop)

    # 3) Final encodes (no audio track). Tune CRF down until both are under the size limit.
    mp4 = OUT / 'demo-loop.mp4'
    for crf in (18, 20, 22, 24, 26, 28, 30, 32):
        run([FF, '-y', '-i', str(loop), '-an', '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'veryslow',
             '-crf', str(crf), '-maxrate', '1250k', '-bufsize', '2500k', '-pix_fmt', 'yuv420p',
             '-r', str(FPS), '-movflags', '+faststart', str(mp4)])
        if mp4.stat().st_size < MAX_BYTES * 0.92:
            break

    webm = OUT / 'demo-loop.webm'
    for crf in (26, 28, 30, 32, 34, 36, 38, 40):
        run([FF, '-y', '-i', str(loop), '-an', '-c:v', 'libvpx-vp9', '-b:v', '1250k', '-crf', str(crf),
             '-deadline', 'good', '-cpu-used', '1', '-row-mt', '1', '-pix_fmt', 'yuv420p', '-r', str(FPS), str(webm)])
        if webm.stat().st_size < MAX_BYTES * 0.92:
            break

    # 4) Poster: one frame from the final clip
    run([FF, '-y', '-ss', str(POSTER_AT), '-i', str(loop), '-frames:v', '1', '-q:v', '2', str(OUT / 'poster.jpg')])

print(f'clip length {final_len:.2f}s')
for f in ('demo-loop.mp4', 'demo-loop.webm', 'poster.jpg'):
    p = OUT / f
    print(f'{f}: {p.stat().st_size / 1024:.0f} KB')
