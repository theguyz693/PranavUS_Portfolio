"""
Step 2 of the hype video: compose the captured scenes into a 12.5 s ad.

Reads work/scenes.json + frames from capture_scenes.py and renders
1920x1200 @ 30 fps with eased camera push-ins/pans, Anton captions (cream on
near-black, gold accent), a cursor with click ripples, motion-blurred cuts, a
vignette and an end card that is also the first frame (seamless loop).

    python compose_hype.py      ->  ../media/demo-loop.mp4, demo-loop.webm, poster.jpg
"""

import json
import math
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = Path(__file__).resolve().parent
WORK = HERE / "work"
OUT = HERE.parent / "media"
sys.path.insert(0, r"C:\va")
from ui.character import ACCENTS, compose, palette_for   # Novi's real sprite, for the end card

import imageio_ffmpeg

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
OW, OH, FPS = 1920, 1200, 30
DURATION = 12.5
CREAM, INK, GOLD = (233, 227, 216), (9, 9, 9), (216, 184, 120)
ANTON = str(HERE / "fonts" / "Anton-Regular.ttf")
SUBFONT = r"C:\Windows\Fonts\segoeui.ttf"

META = json.loads((WORK / "scenes.json").read_text())
SRC_W, SRC_H = META["size"]
SCENES = META["scenes"]


def ease(t):          # easeInOutCubic
    t = min(max(t, 0.0), 1.0)
    return 4 * t * t * t if t < 0.5 else 1 - (-2 * t + 2) ** 3 / 2


def ease_out(t):
    t = min(max(t, 0.0), 1.0)
    return 1 - (1 - t) ** 3


def lerp(a, b, t):
    return a + (b - a) * t


# ── source frames & camera ────────────────────────────────────────────────────

_cache = {}


def frame(scene, t):
    n = min(max(int(round(t * FPS)), 0), SCENES[scene]["frames"] - 1)
    key = (scene, n)
    if key not in _cache:
        if len(_cache) > 90:
            _cache.clear()
        _cache[key] = Image.open(WORK / scene / f"{n:05d}.jpg").convert("RGB")
    return _cache[key]


def cam_box(cam):
    """cam = (cx, cy, width) in source pixels, 16:10. Returns the source box, kept inside the frame."""
    cx, cy, w = cam
    w = min(w, SRC_W)
    h = w * OH / OW
    x0 = min(max(cx - w / 2, 0), SRC_W - w)
    y0 = min(max(cy - h / 2, 0), SRC_H - h)
    return x0, y0, x0 + w, y0 + h


def shoot(scene, t, cam):
    box = cam_box(cam)
    img = frame(scene, t).transform((OW, OH), Image.Transform.EXTENT, box, Image.Resampling.BICUBIC)
    return img, box


def to_out(box, sx, sy):
    x0, y0, x1, y1 = box
    return (sx - x0) / (x1 - x0) * OW, (sy - y0) / (y1 - y0) * OH


# ── shots ─────────────────────────────────────────────────────────────────────
# Each shot: output start/end, scene, source start/end, camera start/end (cx, cy, width), caption.
R = SCENES["states"]["rects"]["character"]
ROBOT = (R[0] + R[2] / 2, R[1] + R[3] / 2)
WA = SCENES["workers"]["rects"]["answer"]
SC = SCENES["snip"]["rects"]["code"]
SA = SCENES["snip"]["rects"]["answer"]
PN = SCENES["panel"]["rects"]["panel"]
mk = {name: s["marks"] for name, s in SCENES.items()}

SHOTS = [
    # Hook: out of the end card into Novi
    dict(t0=0.25, t1=1.10, scene="states", s0=0.25, s1=1.10,
         cam0=(ROBOT[0] - 60, ROBOT[1] + 10, 640), cam1=(ROBOT[0] - 260, ROBOT[1] + 20, 980),
         cap="MEET NOVI."),
    # Hero: ask -> workers -> one answer
    dict(t0=1.10, t1=1.85, scene="workers", s0=mk["workers"]["listen"] + 0.3, s1=mk["workers"]["workers"] - 0.1,
         cam0=(ROBOT[0] - 300, ROBOT[1] + 40, 1100), cam1=(ROBOT[0] - 260, ROBOT[1] + 60, 1000),
         cap="JUST ASK.", sub="\u201cWhich is hotter right now, Delhi or Mumbai?\u201d"),
    dict(t0=1.85, t1=3.30, scene="workers", s0=mk["workers"]["workers"] + 0.3, s1=mk["workers"]["answer"] - 0.2,
         cam0=(SRC_W + 20 - 600, 575, 1200), cam1=(SRC_W + 20 - 575, 575, 1150),
         cap="SPLITS THE WORK.", pos="br"),
    dict(t0=3.30, t1=4.15, scene="workers", s0=mk["workers"]["answer"] + 0.45, s1=mk["workers"]["answer"] + 1.3,
         cam0=(WA[0] + WA[2] / 2 + 120, WA[1] + WA[3] / 2 - 60, 1300), cam1=(WA[0] + WA[2] / 2 + 90, WA[1] + WA[3] / 2 - 50, 1180),
         cap="ONE ANSWER."),
    # Wow 1: snip -> explanation
    # (camera centres chosen so the UI sits above the caption band at the bottom)
    dict(t0=4.15, t1=5.25, scene="snip", s0=mk["snip"]["press"] - 0.35, s1=mk["snip"]["release"] + 0.25,
         cam0=(610, SC[1] + SC[3] - 141, 1150), cam1=(590, SC[1] + SC[3] - 131, 1050),
         cap="SNIP IT.", cursor=True),
    dict(t0=5.25, t1=6.65, scene="snip", s0=mk["snip"]["answer"] + 0.4, s1=mk["snip"]["answer"] + 1.8,
         cam0=(700, SA[1] + SA[3] - 190, 1400), cam1=(690, SA[1] + SA[3] - 185, 1300),
         cap="GET IT."),
    # Wow 2: fast mood cuts
    dict(t0=6.65, t1=7.25, scene="states", s0=mk["states"]["listening"] + 0.2, s1=mk["states"]["listening"] + 0.8,
         cam0=(ROBOT[0] - 220, ROBOT[1], 760), cam1=(ROBOT[0] - 200, ROBOT[1], 700), cap="LIVES ON YOUR DESKTOP.", cap_span=(6.65, 9.0)),
    dict(t0=7.25, t1=7.85, scene="states", s0=mk["states"]["thinking"] + 0.2, s1=mk["states"]["thinking"] + 0.8,
         cam0=(ROBOT[0] - 160, ROBOT[1] - 10, 660), cam1=(ROBOT[0] - 190, ROBOT[1] - 10, 720), cap="LIVES ON YOUR DESKTOP.", cap_span=(6.65, 9.0)),
    dict(t0=7.85, t1=8.45, scene="states", s0=mk["states"]["working"] + 0.2, s1=mk["states"]["working"] + 0.8,
         cam0=(ROBOT[0] - 230, ROBOT[1] + 10, 780), cam1=(ROBOT[0] - 210, ROBOT[1] + 10, 710), cap="LIVES ON YOUR DESKTOP.", cap_span=(6.65, 9.0)),
    dict(t0=8.45, t1=9.05, scene="states", s0=mk["states"]["celebrate"] + 0.1, s1=mk["states"]["celebrate"] + 0.7,
         cam0=(ROBOT[0] - 170, ROBOT[1] - 20, 680), cam1=(ROBOT[0] - 200, ROBOT[1] - 20, 760), cap="LIVES ON YOUR DESKTOP.", cap_span=(6.65, 9.0)),
    # Payoff: everything tracked
    dict(t0=9.05, t1=11.45, scene="panel", s0=mk["panel"]["open"] + 0.5, s1=mk["panel"]["open"] + 2.9,
         # Push in anchored on the panel's left edge (kept ~900 px from the left) so it never meets the title
         cam0=(PN[0] - 900 * 1500 / OW + 750, 469, 1500), cam1=(PN[0] - 900 * 1420 / OW + 710, 444, 1420),
         cap="EVERY STEP. TRACKED.", pos="lm"),
]
END_IN = (11.45, 11.85)     # Payoff -> end card
CUT_BLUR = 0.17             # Seconds of motion blur either side of a cut


# ── end card (also the first frame) ───────────────────────────────────────────

def text_spaced(draw, xy, text, font, fill, spacing):
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=font, fill=fill)
        x += draw.textlength(ch, font=font) + spacing


def end_card():
    img = Image.new("RGB", (OW, OH), INK)
    # Soft gold glow behind the robot
    glow = Image.new("L", (OW, OH), 0)
    ImageDraw.Draw(glow).ellipse([440, 330, 980, 870], fill=30)
    glow = glow.filter(ImageFilter.GaussianBlur(120))
    img = Image.composite(Image.new("RGB", (OW, OH), GOLD), img, glow)
    d = ImageDraw.Draw(img)
    # Novi's real sprite, rendered crisp
    rows, pal, px = compose("normal"), palette_for(ACCENTS["IDLE"], 1.0), 18
    rx, ry = 560, 600 - len(rows) * px // 2
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if pal.get(ch):
                d.rectangle([rx + x * px, ry + y * px, rx + x * px + px - 1, ry + y * px + px - 1], fill=pal[ch])
    title = ImageFont.truetype(ANTON, 270)
    d.text((930, 420), "NOVI", font=title, fill=CREAM)
    d.rectangle([938, 760, 1158, 768], fill=GOLD)
    sub = ImageFont.truetype(ANTON, 44)
    text_spaced(d, (938, 800), "LOCAL AI DESKTOP AGENT", sub, (180, 175, 166), 6)
    return img, (rx + 8 * px, 600)          # Robot centre, for the zoom into the live footage


END, END_ROBOT = end_card()
END_NP = np.asarray(END, dtype=np.float32)


def end_card_zoomed(scale, centre_to):
    """End card scaled about the robot, with the robot moved toward centre_to."""
    cx, cy = END_ROBOT
    w, h = OW / scale, OH / scale
    tx, ty = centre_to
    x0 = cx - tx / OW * w
    y0 = cy - ty / OH * h
    return END.transform((OW, OH), Image.Transform.EXTENT, (x0, y0, x0 + w, y0 + h), Image.Resampling.BICUBIC)


# ── overlays ──────────────────────────────────────────────────────────────────

CAP_FONT = ImageFont.truetype(ANTON, 124)
SUB_FONT = ImageFont.truetype(SUBFONT, 36)
yy, xx = np.mgrid[0:OH, 0:OW]
_r = np.sqrt(((xx - OW / 2) / (OW / 2)) ** 2 + ((yy - OH / 2) / (OH / 2)) ** 2)
VIGNETTE = (1 - 0.42 * np.clip(_r - 0.35, 0, None) ** 1.6)[..., None].astype(np.float32)


BIG_FONT = ImageFont.truetype(ANTON, 140)


def draw_caption(img, text, sub, age, life, drift, pos="bl"):
    """
    Slide/fade in over 0.35 s, out over the last 0.25 s; drifts slightly (parallax).
    pos: "bl" bottom-left, "br" bottom-right, "lm" big stacked title at left-middle.
    """
    a_in = ease_out(age / 0.35)
    a_out = 1 - ease(max(0.0, age - (life - 0.25)) / 0.25)
    alpha = max(0.0, min(a_in, a_out))
    if alpha <= 0:
        return img
    layer = Image.new("RGBA", (OW, OH), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    if pos == "lm":
        lines = [w if w.endswith(".") else w + "." for w in text.rstrip(".").split(". ")]
        font, step = BIG_FONT, 164
        x, y = 128 + drift, OH / 2 - step * len(lines) / 2 - 40 + (1 - a_in) * 46
    else:
        lines, font, step = [text], CAP_FONT, 0
        y = OH - 300 + (1 - a_in) * 46 - (40 if sub else 0)
        tw = d.textlength(text, font=font)
        x = (OW - 128 - tw - drift) if pos == "br" else (128 + drift)
    widths = [d.textlength(line, font=font) for line in lines]
    height = step * (len(lines) - 1) + font.size * 1.35 + (70 if sub else 0)
    # Soft dark pad behind the text so it reads over busy UI
    pad = Image.new("L", (OW, OH), 0)
    ImageDraw.Draw(pad).rounded_rectangle([x - 50, y - 30, x + max(widths + [760 if sub else 0]) + 60, y + height + 40],
                                          40, fill=int(150 * alpha))
    pad = pad.filter(ImageFilter.GaussianBlur(40))
    img = Image.composite(Image.new("RGB", (OW, OH), INK), img, pad)
    for i, line in enumerate(lines):
        d.text((x, y + i * step), line, font=font, fill=CREAM + (int(255 * alpha),))
    line_y = y + step * (len(lines) - 1) + font.size * 1.35
    line_w = 120 * ease_out((age - 0.1) / 0.4)
    lx = x + (widths[-1] - line_w if pos == "br" else 4)
    d.rectangle([lx, line_y, lx + line_w, line_y + 7], fill=GOLD + (int(255 * alpha),))
    if sub:
        d.text((x + 4, line_y + 28), sub, font=SUB_FONT, fill=(205, 199, 189, int(235 * alpha)))
    return Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")


CURSOR = [(0, 0), (0, 40), (10, 31), (17, 47), (24, 44), (17, 29), (30, 29)]


def draw_cursor(img, x, y, ripples):
    layer = Image.new("RGBA", (OW, OH), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for rx, ry, age in ripples:
        if 0 <= age <= 0.5:
            r = 18 + 90 * ease_out(age / 0.5)
            a = int(220 * (1 - age / 0.5))
            d.ellipse([rx - r, ry - r, rx + r, ry + r], outline=GOLD + (a,), width=6)
    s = 1.55
    pts = [(x + px * s, y + py * s) for px, py in CURSOR]
    shadow = [(px + 5, py + 7) for px, py in pts]
    d.polygon(shadow, fill=(0, 0, 0, 120))
    d.polygon(pts, fill=(247, 244, 238, 255), outline=(20, 20, 20, 255))
    d.line(pts + [pts[0]], fill=(20, 20, 20, 255), width=3)
    return Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")


def cursor_at(scene, s, s_start):
    """Cursor position in source px at scene time s; glides in from the lower right before the press."""
    path = SCENES[scene]["cursor"]
    first = path[0]
    if s <= first[0]:
        k = ease((s - s_start) / max(first[0] - s_start, 0.01))
        return lerp(first[1] + 520, first[1], k), lerp(first[2] + 360, first[2], k)
    for (ta, xa, ya, _), (tb, xb, yb, _) in zip(path, path[1:]):
        if ta <= s <= tb:
            k = (s - ta) / max(tb - ta, 1e-3)
            return lerp(xa, xb, k), lerp(ya, yb, k)
    return path[-1][1], path[-1][2]


def motion_blur(img, strength):
    """Horizontal smear for whip transitions."""
    if strength <= 0.02:
        return img
    a = np.asarray(img, dtype=np.float32)
    steps, span = 7, int(70 * strength)
    acc = np.zeros_like(a)
    for i in range(steps):
        acc += np.roll(a, int((i - steps // 2) * span / steps), axis=1)
    return Image.fromarray(np.clip(acc / steps, 0, 255).astype(np.uint8))


# ── render ────────────────────────────────────────────────────────────────────

def shot_at(t):
    for i, s in enumerate(SHOTS):
        if s["t0"] <= t < s["t1"]:
            return i, s
    return None, None


def render_shot(s, t):
    k = (t - s["t0"]) / (s["t1"] - s["t0"])
    src_t = lerp(s["s0"], s["s1"], k)
    e = ease(k)
    cam = tuple(lerp(a, b, e) for a, b in zip(s["cam0"], s["cam1"]))
    img, box = shoot(s["scene"], src_t, cam)
    if s.get("cursor"):
        sx, sy = cursor_at(s["scene"], src_t, s["s0"])
        ox, oy = to_out(box, sx, sy)
        ripples = []
        for ct, cx, cy, pressed in SCENES[s["scene"]]["cursor"]:
            if pressed and ct == SCENES[s["scene"]]["cursor"][0][0] or (not pressed):
                rx, ry = to_out(box, cx, cy)
                ripples.append((rx, ry, (src_t - ct) / ((s["s1"] - s["s0"]) / (s["t1"] - s["t0"]))))
        img = draw_cursor(img, ox, oy, ripples)
    return img, cam


def caption_for(s, t, cam):
    span = s.get("cap_span", (s["t0"], s["t1"]))
    drift = -(cam[0] - s["cam0"][0]) * 0.05 + (t - span[0]) * 10     # Slow counter-drift (parallax)
    return s["cap"], s.get("sub"), t - span[0], span[1] - span[0], drift, s.get("pos", "bl")


def render(t):
    if t < SHOTS[0]["t0"] + 0.4:                              # Hook: end card zooms into the live robot
        if t < SHOTS[0]["t0"]:
            img = END.copy()
        else:
            k = ease((t - SHOTS[0]["t0"]) / 0.4)
            zoom = end_card_zoomed(1 + 1.3 * k, (lerp(END_ROBOT[0], OW / 2 + 140, k), lerp(END_ROBOT[1], OH / 2 - 10, k)))
            live, cam = render_shot(SHOTS[0], max(t, SHOTS[0]["t0"]))
            fade = ease((t - SHOTS[0]["t0"] - 0.1) / 0.3)
            img = Image.blend(zoom, live, fade)
            img = motion_blur(img, 0.5 * math.sin(math.pi * k))
            if t >= SHOTS[0]["t0"] + 0.2:
                img = draw_caption(img, *caption_for(SHOTS[0], t, cam))
        return finish(img)
    if t >= END_IN[0]:                                        # Payoff -> end card
        k = ease((t - END_IN[0]) / (END_IN[1] - END_IN[0]))
        if k >= 1:
            return END.copy()                                 # Identical to frame 0: seamless loop
        last = SHOTS[-1]
        live, cam = render_shot(last, min(t, last["t1"] - 1e-3))
        return finish(Image.blend(live, END, k), vignette_weight=1 - k)
    i, s = shot_at(t)
    img, cam = render_shot(s, t)
    img = draw_caption(img, *caption_for(s, t, cam))
    # Whip blur around cuts between shots
    blur = 0.0
    if i > 0 and t - s["t0"] < CUT_BLUR:
        blur = 1 - (t - s["t0"]) / CUT_BLUR
    if t > s["t1"] - CUT_BLUR and i + 1 < len(SHOTS):
        blur = max(blur, 1 - (s["t1"] - t) / CUT_BLUR)
    return finish(motion_blur(img, 0.6 * blur))


def finish(img, vignette_weight=1.0):
    if vignette_weight <= 0:
        return img
    a = np.asarray(img, dtype=np.float32)
    v = 1 - (1 - VIGNETTE) * vignette_weight
    return Image.fromarray(np.clip(a * v, 0, 255).astype(np.uint8))


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    total = int(round(DURATION * FPS))
    mp4 = OUT / "demo-loop.mp4"
    poster_t, poster = 2.75, None
    for crf in (20, 23, 26, 29):
        enc = subprocess.Popen(
            [FFMPEG, "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{OW}x{OH}",
             "-r", str(FPS), "-i", "-", "-an", "-c:v", "libx264", "-profile:v", "high", "-preset", "slow",
             "-crf", str(crf), "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(mp4)], stdin=subprocess.PIPE)
        for n in range(total):
            t = n / FPS
            img = render(t)
            if abs(t - poster_t) < 0.5 / FPS:
                poster = img
            enc.stdin.write(img.tobytes())
            if n % 30 == 0:
                print(f"  rendered {n}/{total}", flush=True)
        enc.stdin.close()
        enc.wait()
        if mp4.stat().st_size < 6_000_000:
            break
        print(f"  {mp4.stat().st_size / 1e6:.1f} MB at crf {crf}; re-encoding smaller")
    poster.save(OUT / "poster.jpg", quality=92)
    subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", str(mp4), "-an", "-c:v", "libvpx-vp9", "-b:v", "0",
                    "-crf", "33", "-row-mt", "1", "-deadline", "good", "-cpu-used", "2", str(OUT / "demo-loop.webm")],
                   check=True)
    for name in ("demo-loop.mp4", "demo-loop.webm", "poster.jpg"):
        print(f"wrote {OUT / name} ({(OUT / name).stat().st_size / 1e6:.2f} MB)")


if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[1] == "--preview":
        # python compose_hype.py --preview 0.5,2.7,5.9  ->  work/preview_<t>.png
        for t in (float(v) for v in sys.argv[2].split(",")):
            render(t).save(WORK / f"preview_{t:.2f}.png")
            print(f"preview {t:.2f}s")
    else:
        main()
