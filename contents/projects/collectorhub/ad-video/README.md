# CollectorHub ad video — re-run end to end

Needs: Google Chrome installed, Node 20+, and the CollectorHub dev server running.

```bash
# 1. Start CollectorHub on port 5180 (from the HW_db repo)
pnpm --filter @collectorhub/web exec vite --port 5180 --strictPort

# 2. In this folder
npm install
npm run build          # capture 360 frames (~11 min), then encode
```

Outputs land in `ad-final/`: demo-loop.mp4 (H.264), demo-loop.webm (VP9), poster.jpg — 1920x1200, 30 fps, 12.0 s, no audio.
Override the app URL with `BASE=http://localhost:XXXX`.

- `ad-capture.mjs` seeds a throwaway Chrome profile (reorders the built-in demo garage to real-car castings),
  then drives the app with Playwright's fake clock and screenshots every frame; camera moves, captions (Anton),
  vignette, cursor/ripples and the name card are an overlay injected into the page. No project code is changed.
- `ad-encode.mjs` encodes the frames with Chrome's WebCodecs (H.264 + VP9) into MP4/WebM at a constant 30 fps
  and reports durations (browser decode + the MP4 mvhd header).
