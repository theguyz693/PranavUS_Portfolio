"""
Demo harness for recording a Light Reaction clip WITHOUT touching the project.

Runs the project's real aiohttp app, dashboard and sync loop, but swaps two things:
  * the BLE client  -> a fake that just remembers the last packet written
  * the mss capture -> a fake that returns frames of a synthetic colour scene
Adds /demo (wrapper page: simulated screen + simulated lamp + live packet hex).
"""
import json
import os
import sys
import time

sys.dont_write_bytecode = True
sys.path.insert(0, r"C:\light_reaction")

import app as light  # the user's real app module (read-only use)
from aiohttp import web

PORT = 5057
T0 = time.time()
HOLD, CYCLE_STEP = 1.8, 3.0  # each scene lasts 3s: hold 1.8s, then fade
KEYS = [
    ((255, 120, 40), (140, 40, 60)),   # sunset
    ((20, 120, 210), (0, 40, 100)),    # deep blue
    ((40, 200, 120), (10, 80, 60)),    # green
    ((220, 40, 120), (90, 10, 90)),    # magenta
]
PACKET = {"bytes": [], "t": 0.0}


def ease(x):
    return x * x * (3 - 2 * x)


def scene(t):
    n = len(KEYS)
    t = t % (n * CYCLE_STEP)
    i = int(t // CYCLE_STEP)
    phase = t - i * CYCLE_STEP
    a, b = KEYS[i], KEYS[(i + 1) % n]
    f = 0.0 if phase < HOLD else ease((phase - HOLD) / (CYCLE_STEP - HOLD))
    mix = lambda p, q: tuple(round(p[k] + (q[k] - p[k]) * f) for k in range(3))
    return mix(a[0], b[0]), mix(a[1], b[1])


class FakeShot:
    def __init__(self, size, bgra):
        self.size, self.bgra = size, bgra


class FakeMSS:
    monitors = [
        {"left": 0, "top": 0, "width": 1920, "height": 1080},
        {"left": 0, "top": 0, "width": 1920, "height": 1080},
    ]

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def grab(self, monitor):
        top, bot = scene(time.time() - T0)
        w, h = 32, 18
        rows = []
        for y in range(h):
            f = y / (h - 1)
            c = [round(top[i] + (bot[i] - top[i]) * f) for i in range(3)]
            rows.append(bytes([c[2], c[1], c[0], 255]) * w)
        return FakeShot((w, h), b"".join(rows))


class FakeClient:
    is_connected = True
    services = []

    async def write_gatt_char(self, uuid, data, response=False):
        PACKET["bytes"] = list(data)
        PACKET["t"] = time.time()

    async def disconnect(self):
        pass


light.mss.mss = FakeMSS
light.state.client = FakeClient()
light.state.connected = True
light.state.address = "DEMO-LIGHT"

WRAPPER = open(os.path.join(os.path.dirname(__file__), "wrapper.html"), encoding="utf-8").read()
WRAPPER = WRAPPER.replace("__KEYS__", json.dumps(KEYS)).replace("__STEP__", str(CYCLE_STEP)).replace("__HOLD__", str(HOLD))


async def demo_page(request):
    return web.Response(text=WRAPPER, content_type="text/html")


async def demo_state(request):
    return web.json_response({"t": time.time() - T0, "packet": PACKET["bytes"]})


async def demo_reset(request):
    global T0
    T0 = time.time()
    return web.json_response({"ok": True})


def main():
    app = light.create_app()
    app.router.add_get("/demo", demo_page)
    app.router.add_get("/demo/state", demo_state)
    app.router.add_post("/demo/reset", demo_reset)
    web.run_app(app, host="127.0.0.1", port=PORT, print=None)


if __name__ == "__main__":
    main()
