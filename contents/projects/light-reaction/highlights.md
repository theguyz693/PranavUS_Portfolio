# Highlights

## Resume bullets
- Built a screen-reactive "Ambilight" for a Bluetooth LE RGB light in Python, capturing the display with mss/Pillow and streaming averaged colour over BLE with bleak.
- Designed a single-process asyncio backend (aiohttp REST + WebSocket) that coordinates BLE I/O, screen capture and live UI updates on one event loop.
- Built a local browser dashboard (vanilla JS) with BLE device scanning, mode switching (sync / manual / off), monitor selection, brightness, presets and live colour preview.
- Added adjustable sync rate (3-15 FPS) and a colour-change threshold to limit BLE writes.
- Worked out the light's vendor-specific 9-byte command protocol by testing, including a power-off sequence with fallbacks, and wrote a CLI tester (`inspect_melk.py`) and GATT inspection endpoint to support it.
- Supports multi-monitor setups by enumerating displays with mss and letting the user choose the capture source.

(No performance numbers included: none were measured. TODO: add latency/FPS figures if you measure them.)

## Interview talking points
1. **Why one asyncio loop instead of threads?** BLE (bleak), the web server and the sync loop are all async-friendly, so sharing one loop with an `asyncio.Lock` around connect/mode changes avoids thread-safety issues with shared state. Tradeoff to mention honestly: screen grabs are blocking calls in that loop.
2. **Why average the whole screen and gate sends with a threshold?** Averaging to 1x1 is the cheapest way to get a representative colour, and BLE writes are the bottleneck, so skipping sends for small changes keeps the light responsive. The limitation is no zone-based colours.
3. **Why is the protocol hardcoded, and what's next?** The light's commands were found by testing against one device, so UUID, packets and name keywords are constants. The next step is making these configurable/auto-detected so others with the same brand can use it. TODO: add what you've learned about differences between units, if anything.
