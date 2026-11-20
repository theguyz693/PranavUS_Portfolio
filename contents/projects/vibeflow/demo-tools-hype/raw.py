"""Step 2: turn each recorded shot (uneven frame times) into a constant 30 fps clip at the source size.
Output frames are a time-weighted blend of the two nearest source frames (smoother than repeating frames).
Usage: python raw.py ipod screens companion editorial   (needs: pip install opencv-python numpy; env FFMPEG)"""
import json, os, subprocess, sys
import cv2, numpy as np
FF = os.environ.get("FFMPEG", "ffmpeg")
FPS = 30
for name in sys.argv[1:]:
    fr = json.load(open(f"frames/{name}/times.json"))
    t0 = fr[0]["t"]; span = fr[-1]["t"] - t0
    first = cv2.imread(f"frames/{name}/{fr[0]['file']}"); h, w = first.shape[:2]
    p = subprocess.Popen([FF, "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{w}x{h}", "-r", str(FPS), "-i", "-",
                          "-c:v", "libx264", "-crf", "10", "-preset", "fast", "-pix_fmt", "yuv420p", f"raw_{name}.mp4"], stdin=subprocess.PIPE)
    cache = {}
    def get(i):
        if i not in cache:
            cache.clear() if len(cache) > 3 else None
            cache[i] = cv2.imread(f"frames/{name}/{fr[i]['file']}")
        return cache[i]
    j = 0
    for k in range(int(span * FPS)):
        t = t0 + k / FPS
        while j + 1 < len(fr) - 1 and fr[j + 1]["t"] <= t: j += 1
        a, b = get(j), get(min(j + 1, len(fr) - 1))
        dt = fr[min(j + 1, len(fr) - 1)]["t"] - fr[j]["t"]
        wgt = 0.0 if dt <= 0 else min(1.0, max(0.0, (t - fr[j]["t"]) / dt))
        p.stdin.write((cv2.addWeighted(a, 1 - wgt, b, wgt, 0) if 0.02 < wgt < 0.98 else (a if wgt <= 0.02 else b)).tobytes())
    p.stdin.close(); p.wait()
    c = cv2.VideoCapture(f"raw_{name}.mp4"); print(name, f"{w}x{h}", "dur", round(c.get(7) / c.get(5), 2), "real", round(span, 2))
