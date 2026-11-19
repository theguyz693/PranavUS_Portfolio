# Demo-clip tools (VibeFlow)

Re-creates `media/demo-loop.mp4` using CLEARLY FAKE data: a made-up logged-in session, a made-up track
("Neon Drift" by "Sample Artist"), made-up lyrics and a generated cover (`art.png`). These are injected in the
browser by `capture.mjs`; the VibeFlow repo is not modified and no real Spotify account is used.

1. In the VibeFlow repo: `npm run dev:web -- --port 5173` (leave it running).
2. Here: `npm i playwright-core@1.56.1`, then `node capture.mjs` (records ipod, disc, reel, screens, editorial into `frames/`;
   Math.random is seeded so the "random" entrances repeat). One shot: `node capture.mjs ipod`.
3. `set FFMPEG=<path to ffmpeg.exe>` then `python build_raw.py ipod disc editorial screens`, then `python assemble.py`.
   (`build_raw.py` needs `pip install opencv-python`.)
4. Encode: `ffmpeg -i loop_raw.mp4 -vf scale=1280:-2,fps=24 -c:v libx264 -profile:v high -preset slow -crf 23 -maxrate 1.1M -bufsize 2.2M -pix_fmt yuv420p -an -movflags +faststart demo-loop.mp4`
   and for WebM: `... -c:v libvpx-vp9 -b:v 1000k -crf 30 -row-mt 1 -pix_fmt yuv420p -an demo-loop.webm`.

`capture.mjs` expects Chrome at `C:/Program Files/Google/Chrome/Application/chrome.exe` (set `CHROME` to override) and the app at
`http://127.0.0.1:5173/` (set `APP_URL` to override).

Cut used (raw file, start s, length s), see `assemble.py`: disc 1.3, ipod 0.6, ipod 5.3, editorial 2.8, screens 1.2, disc 11.6 (3 s each).
