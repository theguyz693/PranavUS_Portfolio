# Architecture

## How it works
`app.py` runs one asyncio event loop that hosts everything: an aiohttp web server (port 5000, bound to 127.0.0.1), the BLE connection (bleak), and a background screen-sync task.

- **Browser dashboard** (`static/`) calls REST endpoints (`/api/scan`, `/api/connect`, `/api/mode`, `/api/color`, `/api/settings`, `/api/monitors`, `/api/inspect`, `/api/send_packet`) and keeps a WebSocket (`/ws`) open to receive live status and the current screen colour. The page auto-reconnects its WebSocket after 2 s.
- **Shared state** (`AppState`): connection, mode (`off` / `manual` / `sync`), colour, brightness, FPS, threshold, selected monitor.
- **Sync loop**: grabs the selected monitor with mss, shrinks the frame to 1x1 with Pillow to get the average RGB, and sends it to the light if it differs enough from the last sent colour. Each frame's colour is also broadcast to the browser. Sleep time is derived from the FPS setting.
- **BLE writes**: 9-byte packets (`7E ... EF`) written without response to GATT characteristic `fff3`. Colour is scaled by the brightness percentage in software.
- `screen_sync.py` is a standalone CLI version; `inspect_melk.py` is a manual protocol tester.

## Diagram
```
 Browser dashboard  --- REST (/api/*) --->  aiohttp server (app.py)
 (static/ HTML/JS)  <-- WebSocket /ws ---   |  AppState + asyncio.Lock
                                            |
                         +------------------+------------------+
                         |                                     |
                 sync loop task                           BLE client (bleak)
          mss grab -> Pillow 1x1 average  --RGB-->  write 9-byte packet to fff3
          threshold check, FPS throttle                         |
                                                        Bluetooth RGB light
```

## Key design decisions and tradeoffs
- **Single process, one event loop.** Web server, BLE and capture share state without threads. Tradeoff: screen grabbing is blocking work inside the loop, which could stall other requests at high FPS (not measured; TODO).
- **Average colour of the whole screen (1x1 resize).** Very cheap and simple. Tradeoff: no per-zone or dominant-colour logic, so mixed scenes tend to look muddy.
- **Threshold-gated sending.** Only transmits when the colour changes by at least the threshold (sum of channel differences, default 12). Reduces BLE traffic. Tradeoff: tiny gradual changes are not followed until they add up.
- **Write without response.** Faster updates; no delivery confirmation.
- **Power-off sent as several packets** (two variants plus a black fallback) because the exact supported command was found by testing. Tradeoff: redundant commands, but reliable on the author's device.
- **Hardcoded protocol constants** (characteristic UUID, device name keywords, packet formats). Fine for one device; the planned work is to make this configurable for other units of the same brand.
- **Local-only server on 127.0.0.1.** No auth needed, but it also can't be hosted, which matters for the website demo (see glimpse-plan.md).
- **The light accepts one BLE connection at a time**, so the phone app must be closed first (noted in the README).
