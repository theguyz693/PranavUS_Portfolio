# Light Reaction

**Pitch:** Makes a Bluetooth RGB light glow in the colour of your screen.

## What it is
A local web app that connects to a Bluetooth LE RGB light (built around an ELK-BLEDOM / Lotus Lamp X-style controller, tested model name in code: MELK-OA10) and sets its colour from your screen in real time, like an Ambilight backlight. A browser dashboard handles scanning for the light, connecting, switching between screen sync / manual colour / off, and tuning sync speed. Currently hardcoded for the author's own light.

## Stack
- Python 3, asyncio
- aiohttp (HTTP API + WebSocket)
- bleak (Bluetooth LE)
- mss + Pillow (screen capture and colour averaging)
- Vanilla HTML / CSS / JavaScript frontend (no framework)

## Hardest problem I solved
TODO: confirm which problem you consider hardest. What the code shows: the light's protocol is undocumented/vendor-specific, so the BLE command format had to be worked out by testing. `inspect_melk.py` is an interactive tester for power-off, RGB-wake and two power-on packet variants, and `app.py` carries a note that its power-off sequence is a "preserved working" one: it sends two power-off variants, then a black RGB frame as fallback. Power-on is done by sending an RGB colour packet ("RGB restore"), since the power-on variants are only listed as test actions in the code.

## Result / outcome
- Screen colour sync to the physical light works (commit "Working BLE screen color sync").
- Sync rate is user-adjustable 3-15 FPS in the UI (default 8); a threshold slider skips sends for small colour changes.
- TODO: any measured latency, FPS achieved, or hours of real use. None recorded, so none claimed.

## Links
- Repo: https://github.com/theguyz693/light-reaction (from the git remote; TODO: confirm it is public)
- Live link: TODO (runs locally only; needs a physical BLE light, so no hosted version)

## Status
in progress — working for the author's own light; making it work for other owners of the same light brand is planned, not done.
