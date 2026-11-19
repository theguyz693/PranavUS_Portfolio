# VibeFlow: glimpse plan

## Best fit: small interactive demo
**Why not a live iframe:** the live site needs a Spotify login (README says Premium) and opens on the 3D iPod mode showing "Offline", so a visitor would see an empty player. Whether outside visitors can log in at all is a TODO (see project.md).
**Why not only a recording:** the main idea is switching between very different looks on the same lyrics, which a recording cannot let the visitor try.
**Why it fits:** the lyric visuals already have a built-in demo mode (sample lyrics, no Spotify), so they can run self-contained in the browser with no server.

## What the visitor sees and does
- A stage showing a spinning record and sample lyrics playing on a loop (a Play/Pause button).
- A row of four buttons to switch the look: **Editorial**, **Reel 3D**, **Disc Reel**, **Floating Screens**. The same lyrics carry over, so they can compare.
- A "Show chorus" toggle that marks the lines the app detected as chorus (they repeat) and shows the record spinning faster and the line glowing on those lines.
- What they learn: one lyric timeline can drive very different visuals, and the visuals react to the structure of the song.

## Data and logic needed (self-contained)
- The 12 sample lines with timestamps (`DEMO_LYRICS` in `src/services/lyricAnalysis.ts`) and the chorus logic from `buildLines` (a normalised line that repeats and has 3+ words is chorus).
- A clock that loops the demo (the visuals already compute this from `performance.now()`).
- A fixed colour palette (use the default palette in `themeEngine.ts`, or define one) and, optionally, a cover image that you own (TODO: choose a safe sample cover; do not use a commercial album cover).
- The font file for the 3D glass text (the Bagel Fat One woff) and the four visual components, bundled with three.js and react-three-fiber.
- No Spotify, no server, no network calls (skip the lyric fetch in demo mode).

## Build notes / cautions
- Only one WebGL canvas at a time: unmount the previous visual when switching.
- Pause rendering when the demo scrolls out of view; the glass and reflective floor are the heavy parts.
- Provide a static fallback image or the recording for phones or devices without WebGL.
- TODO: decide whether the demo reuses the real components (best) or a trimmed copy.

## Fallback: recorded loop (10-15 s)
Shot list for `demo-loop.webm`:
1. 0-3 s: Editorial, a line changing with the karaoke fill and a chorus line glowing.
2. 3-6 s: switch to Reel 3D; the glass lyric stack glides up one line.
3. 6-10 s: switch to Disc Reel; two lines with different entrance animations.
4. 10-13 s: switch to Floating Screens; the camera flies to the next screen.
5. 13-15 s: back to the picker menu, showing all the options.
