# Lockout: Glimpse plan

## Recommendation: small interactive demo (with a recorded loop as the fallback and poster)

- **Live iframe:** not possible as-is. Lockout is a browser extension. It only works inside Chrome with extension APIs and real tabs. There is no website to embed. (The popup and block page are plain HTML and the code already falls back to in-memory storage when `chrome.storage` is missing, but they would still need hosting and demo data, which is the demo below.)
- **Recorded loop:** works and is cheap, and a 77-second silent video already exists (`C:\lockout\demo\lockout-demo.mp4`, 1080p). But the interesting part of Lockout is the friction: trying to quit and being stopped. A visitor learns that faster by trying it than by watching it.
- **Interactive demo:** best fit. The real popup, block page and counter pages are self-contained HTML/JS, so they can run in the browser against a fake `chrome.storage` with no server.

## The interactive demo: "Try to quit a lock-in"

**What the visitor sees:** the real Lockout popup (Classic Dark) on the left, labelled "sample data". On the right, a small mock browser with three buttons: **reddit.com**, **a video site**, **an article**.

**What they click and learn:**
1. **Stat screen:** streak, focus today, Shorts and Reels scrolled, and a 7-day chart. Learns that it tracks progress, locally.
2. **Pick a level and a duration, press Lock In.** A timer starts. Learns the four levels: Chill, Focused, Locked In, Monk.
3. **Click "reddit.com" in the mock browser.** The real calm block page appears with their streak and time left. Learns that a slip gets a calm redirect, not a lecture.
4. **Click "End lock-in".** The gate depends on the level: nothing (Chill), a 15-second wait (Focused), a typed pledge with paste disabled plus a wait (Locked In), or no button at all (Monk). This is the core idea.
5. **Click "video site", then toggle "Hide Shorts".** The Shorts shelf and sidebar tab vanish while normal videos stay. Uses the real `shortform.css`.
6. **Press "Scroll a Reel" a few times, then the Alt+Shift+L key button.** The floating counter pops in, ticks up, changes mood emoji, and can be dragged and resized. Offer a "Reels & Shorts only" switch.
7. **Theme switcher:** Classic Dark, Classic Light, Industrial.

**Data and logic it needs (all in the browser):**
- **Files from the repo:** `popup.html/js/css`, `storage.js`, `endgate.js`, `intervention.html/js/css`, `content/overlay.js`, `content/shortform.css`, `fonts/`, `icons/`.
- **A small `chrome` shim** (about 40 lines): `storage.local.get/set`, `storage.onChanged` (via `localStorage` and `storage` events so every iframe stays in sync), `runtime.id` and `runtime.onMessage`. A `?theme=` query override is handy for showing themes side by side.
- **Seed data:** a JSON of 7 days of `daily` stats, `lifetime`, `bestStreak`, `trackTime: true`, with a visible "sample data" label.
- **Fake navigation:** a few lines that copy the URL matching from `background.js` (`isRestricted`, `PATH_RULES`) and load `intervention.html?domain=reddit.com&level=1&attempt=1` into the mock browser when a blocked site is clicked. Do not run `background.js` itself: it needs real tab APIs.
- **Mock pages:** a video-site page using YouTube-shaped tags (`ytd-reel-shelf-renderer`, `ytd-guide-entry-renderer`) so the real CSS applies, with generic branding; and a plain article page for the counter.
- **Optional:** override `Date.now` with a "fast-forward 10 minutes" button so a timed session can be seen finishing. TODO: decide whether to include it.
- **Caveat:** the demo source I used for the video was deleted with temporary files. Only the finished video survives, so this demo has to be rebuilt. TODO: keep the new source in the repo (for example `demo/`).

## Fallback recording: shot list (about 13 s, muted autoplay loop)
Source: `demo/lockout-demo.mp4`. Timestamps are approximate. TODO: check them against the video before cutting.
1. **Stat screen (3 s):** popup opens, numbers count up. *(source ~0:04–0:08)*
2. **Pick a level (3 s):** cursor clicks Chill, Focused, Locked In, Monk. *(source ~0:20–0:28)*
3. **Quit gate (3 s):** End early, then the typed pledge with the countdown. *(source ~0:30–0:35)*
4. **Block page (2 s):** the calm page with streak and time left. *(source ~0:38–0:42)*
5. **Shorts disappear + counter (2 s):** shelf vanishes, then the floating counter pops in. *(source ~0:44–0:55)*

Notes:
- The video is silent and uses sample data and generic mock sites, so it is safe to publish.
- It is a scripted render of the real pages, not a screen recording of Chrome. Say "demo" in the caption, or record a short real-Chrome loop (see `media-checklist.md`) if you want it to look live.
