"""Scripted, repeatable recording of the Light Reaction demo (needs demo_harness.py running)."""
import json
import os
import shutil
import sys
import time
import urllib.request

from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:5057"
HERE = os.path.dirname(os.path.abspath(__file__))
VID = os.path.join(HERE, "video")
SHOTS = os.path.join(HERE, "shots")
os.makedirs(SHOTS, exist_ok=True)
shutil.rmtree(VID, ignore_errors=True)


def post(path, body=None):
    req = urllib.request.Request(
        BASE + path, data=json.dumps(body or {}).encode(), headers={"Content-Type": "application/json"}, method="POST"
    )
    urllib.request.urlopen(req).read()


post("/api/mode", {"mode": "off"})
post("/api/mode", {"mode": "sync"})

with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(
        viewport={"width": 1280, "height": 720},
        record_video_dir=VID,
        record_video_size={"width": 1280, "height": 720},
    )
    page = ctx.new_page()
    t_page = time.time()
    page.goto(BASE + "/demo")
    fr = page.frame_locator("#frame")
    fr.locator("#mode-sync-btn.active").wait_for()
    page.wait_for_timeout(600)
    post("/demo/reset")
    t0 = time.time()
    trim_start = t0 - t_page  # seconds of video to cut from the front

    def at(sec, name=None):
        wait = sec - (time.time() - t0)
        if wait > 0:
            page.wait_for_timeout(int(wait * 1000))
        if name and "--shots" in sys.argv:
            page.screenshot(path=os.path.join(SHOTS, name + ".png"))

    at(1.0, "a_sync_orange")
    at(4.5, "b_sync_blue")
    at(7.5, "c_sync_green")
    at(10.0, "d_sync_magenta")
    fr.locator("#mode-manual-btn").click()
    at(10.8, "e_manual")
    fr.locator('.preset-btn[data-color="#D500F9"]').click()
    at(12.0, "f_purple")
    fr.locator('.preset-btn[data-color="#00F0FF"]').click()
    at(13.3, "g_cyan")
    fr.locator('.preset-btn[data-color="#FFB74D"]').click()
    at(14.6, "h_warm")
    fr.locator("#mode-off-btn").click()
    at(15.8, "i_off")
    post("/demo/reset")
    fr.locator("#mode-sync-btn").click()
    at(18.0, "j_back_sync")
    t_end = time.time() - t_page

    video_path = page.video.path()
    ctx.close()
    browser.close()

final = os.path.join(HERE, "raw.webm")
shutil.copy(video_path, final)
json.dump({"trim_start": trim_start, "end": t_end}, open(os.path.join(HERE, "timing.json"), "w"))
print("raw:", final, "trim_start=%.2f end=%.2f" % (trim_start, t_end))
