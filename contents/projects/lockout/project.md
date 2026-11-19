# Lockout

**Chrome extension that blocks distracting sites and Shorts, with escalating lock-in levels.**

## What it is
Lockout is a Manifest V3 Chrome extension for staying focused. You pick a lock-in level and a timer, and the sites on your list are blocked until it ends. The higher the level, the harder it is to quit: a short wait, then a typed pledge and a longer wait, then no way out inside the extension. It also hides YouTube Shorts without breaking the rest of YouTube, counts the Shorts and Reels you scroll, tracks time on entertainment sites, and keeps day streaks. Everything is stored locally in the browser; there is no server, no account and no tracking.

## Stack
- **Language:** vanilla JavaScript, HTML and CSS (no framework, no build step), about 5,500 lines
- **Platform:** Chrome Extensions Manifest V3: service worker, content scripts, `chrome.storage.local`, `tabs`, `alarms`, `idle`, `scripting`, `activeTab`, `commands`, optional host permissions
- **UI:** Shadow DOM (floating counter), CSS variables for three themes, bundled open-source fonts (Geist, Geist Mono, Host Grotesk, IBM Plex Mono, Instrument Sans)
- **Tooling:** Python (Pillow for icon and promo-image generation; Playwright and ffmpeg for the demo video), PowerShell packaging script
- **Testing:** two ad-hoc Node scripts with a mocked `chrome` API (not in the repo, see Result)

## Hardest problem I solved
**Making stateful features (time tracking, a floating counter, the block flow) reliable inside Manifest V3 and on hostile pages.**

- **A service worker can be killed at any time**, so a naive timer loses time. The tracker keeps the "visit being timed" in `chrome.storage.local`, adds elapsed time in segments, and re-checks on a one-minute alarm and on window-focus, idle, tab and navigation events. A gap longer than three minutes (laptop asleep) is capped to one minute instead of inflating the total.
- **Several writers update the same stats** (navigation handler, tracker, Shorts counter). Every read-modify-write in the worker goes through one promise queue so they cannot overwrite each other.
- **The floating counter did not appear on YouTube.** The likely cause is YouTube's Trusted Types policy, which blocks `innerHTML` in extension scripts. I rebuilt the counter with DOM calls only and reproduced the restriction on a test page with `require-trusted-types-for 'script'`.
- **The permission prompt could be cancelled when opened from the popup** (the popup closes). Access is now requested on a dedicated extension tab, and the counter can also be summoned on any tab with `activeTab` and a keyboard shortcut, with no all-sites permission.

TODO: confirm in real Chrome that the counter now appears on live YouTube. I verified the fix only on a mock page with the same policy.

## Result / outcome
Facts from the repo and our work (not user metrics):
- Feature-complete extension, version 1.6.1, all code in the repo.
- Permissions: 6 API permissions (`storage`, `tabs`, `alarms`, `idle`, `scripting`, `activeTab`) plus optional per-site host access. The first version asked for `<all_urls>` and `webNavigation`; both are gone.
- No network requests of its own. All data stays in `chrome.storage.local`.
- Chrome Web Store assets written: icons, privacy policy, listing text, screenshot list, packaging script.
- A scripted 77-second 1080p demo video rendered from the real pages (`demo/lockout-demo.mp4`, not yet committed).
- Logic tests (session levels, streaks, route matching, tracker, on-demand counter) passed at the last run. TODO: copy the test scripts into the repo so this can be re-run and linked.
- TODO: any real-world numbers (installs, users, feedback). None exist yet.

## Links
- **Repo:** https://github.com/theguyz693/Lockout
- **Live:** TODO: Chrome Web Store link once it is submitted and approved (not submitted as far as I know).
- **Demo video:** `demo/lockout-demo.mp4` in the working copy. TODO: commit it or upload it somewhere public and link it.

## Status
finished (feature-complete). TODO before store submission: add a real contact email to `store/privacy-policy.md`, host the policy at a public URL, take the screenshots in `store/screenshots.md`.
