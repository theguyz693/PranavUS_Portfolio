# Glimpse plan

## Recommendation: small interactive demo
The real app needs a local Python server and a physical Bluetooth light, so a live iframe is impossible. A recording is easy but static; an interactive demo conveys the core idea (screen colour becomes light colour) and can run entirely in the browser.

## The demo (self-contained, no server)
**What the visitor sees:** a dashboard styled like the real UI (reuse `static/style.css`), with a looping video or animated gradient scene on a fake "monitor", and a virtual light strip/glow beside it plus the live `RGB(r, g, b)` and hex readout, as in the real app.

**What they click:**
- Switch between a few preset scenes (e.g. dark movie scene, bright sports scene, game UI). TODO: choose scenes you have rights to use, or generate simple animated ones.
- Mode buttons: Sync / Manual / Off, like the real dashboard.
- Sliders: FPS (3-15) and sensitivity threshold (1-30); manual colour picker, brightness, preset buttons.

**What they learn:** the glow follows the scene; a higher threshold makes the light update less often (show a counter of "packets sent"); lower FPS makes it lag; the manual mode and presets work as in the real tool.

**Logic needed (all browser-side):**
- Draw the scene to a `<canvas>`; every 1/FPS seconds, downscale to 1x1 (`drawImage` to a 1x1 canvas) and read the pixel. This mirrors the Pillow 1x1 resize in `sync_loop_task`.
- Threshold check: same as `color_difference` (sum of absolute R, G, B differences) against the last "sent" colour; increment a packet counter when sent.
- Brightness scaling: `value * brightness / 100`, as in `build_rgb_packet`.
- Optional: show the 9-byte packet `7E 07 05 03 R G B 00 EF` in hex for each send.
- No BLE, no API calls. Presets and colours are copied from `static/index.html`.

## If you'd rather record
Shot list (10-15 s total):
1. (0-3 s) Dashboard with Sync mode on, glow halo visible.
2. (3-8 s) A dark-to-bright scene on the monitor with the physical light visibly changing.
3. (8-11 s) Move the FPS and threshold sliders.
4. (11-13 s) Click a Mood Preset in Manual mode.
5. (13-15 s) Power Off.
