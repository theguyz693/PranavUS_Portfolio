# VibeFlow hype video: re-run end to end

Produces `demo-loop.mp4`, `demo-loop.webm` and `poster.jpg` (1920x1200, 30 fps, no audio, ~12.8 s).
All data on screen is made up: a fake logged-in session, the track "Neon Drift" by "Sample Artist", made-up lyrics and a generated
cover (`art.png`). It is injected in the browser by `lib.mjs`; the VibeFlow repo is NOT modified and no real Spotify account is used.
The app's own menus are hidden with injected CSS, and a big cursor + click ripple is drawn as a page overlay.

Prerequisites: Node 18+, Python 3 with `pip install opencv-python numpy`, Chrome, ffmpeg.

```bash
# 1. start the app (in the VibeFlow repo) and leave it running
npm run dev:web -- --port 5173

# 2. in this folder
npm install
export FFMPEG=/path/to/ffmpeg        # PowerShell: $env:FFMPEG="C:\path\to\ffmpeg.exe"
node capture-hype.mjs                # records ipod, screens, companion, editorial -> frames/
python raw.py ipod screens companion editorial   # constant 30 fps clips -> raw_*.mp4
node captions.mjs                    # Anton caption cards + end card -> overlays/
node build.mjs                       # edit + encode -> out/demo-loop.mp4, .webm, poster.jpg
```
Overrides: `APP_URL` (default http://127.0.0.1:5173/), `CHROME` (default C:/Program Files/Google/Chrome/Application/chrome.exe),
`POSTER_AT` (seconds, default 3.4). `node capture-hype.mjs ipod` re-records a single shot. The edit (windows, zooms, caption timings)
is the `SEG` table at the top of `build.mjs`; `build.mjs` refuses to render anything over 15 s.

Timeline (12.75 s): iPod 0-4.7 "Your music. In 3D." | Floating Screens 4.5-7.0 "Lyrics in motion." | Companion 6.7-9.1 "Scenes that breathe." |
Editorial 8.9-11.3 "Sing along." | end card "VIBEFLOW" + gold line 10.95-12.75, fading to the same #090909 the clip starts from (clean loop).
