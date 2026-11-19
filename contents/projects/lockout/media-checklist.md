# Lockout: Media checklist

Save everything in `media/`. Capture in real Chrome with the unpacked extension loaded (`chrome://extensions` → Developer mode → Load unpacked → `C:\lockout`). Use sample data: do a few short sessions first so the streak and week chart are not empty. Hide the bookmarks bar and personal tab titles.

Tip: the popup closes when it loses focus. To capture it, open it in a normal tab (`chrome-extension://<extension-id>/popup.html`) or use "Inspect popup" in `chrome://extensions`.

## Screenshots (PNG, 1920×1080 or tightly cropped)
| File | What to capture |
|---|---|
| `hero.png` | Popup in Classic Dark, idle: stat screen, level chips and Lock In button. Optionally on a dark desktop. |
| `levels.png` | Popup with **Locked In** selected, showing its blurb, duration chips and the Lock In button. |
| `active-session.png` | Popup during a lock-in: big timer, progress bar, blocked count. |
| `end-gate.png` | End-early dialog in a Locked In session: typed pledge field and the countdown. |
| `block-page.png` | The calm block page after visiting a blocked site, showing streak and time left. |
| `shorts-before-after.png` | Real YouTube home with the Shorts shelf visible, next to the same page with Hide Shorts on. TODO: confirm it works on live YouTube first. |
| `counter.png` | Floating counter on a normal website (mood emoji, ⏳ wasted, 📱 scrolled). |
| `counter-reels-only.png` | Counter set to "Reels & Shorts", enlarged. |
| `tracker-options.png` | Options → Tracker section open, showing the toggles, counter size slider and today's totals. |
| `themes.png` | The popup in Classic Dark, Classic Light and Industrial, side by side. |
| `architecture.png` | Optional: export the Mermaid diagram from `architecture.md` as an image. |

## Reuse without recapturing (already in the repo, `C:\lockout`)
| Existing file | Use for |
|---|---|
| `store\images\marquee-1400x560.png` | Wide banner or card image |
| `store\images\small-promo-440x280.png` | Thumbnail |
| `store\images\store-icon-128.png`, `icons\icon128.png` | Project icon |
| `demo\lockout-demo.mp4` | Full 77 s demo video (silent, scripted render, not yet committed) |

## Recordings
| File | What to capture | Length |
|---|---|---|
| `demo-loop.webm` | The 5-shot loop from `glimpse-plan.md`, muted. Cut from `demo\lockout-demo.mp4` or recorded in real Chrome. | 10–15 s |
| `demo-loop.mp4` | Same loop as an MP4 fallback for Safari. | 10–15 s |
| `poster.jpg` | First frame or the hero screenshot, for the loop's poster image. | n/a |
| `counter-loop.webm` | Optional: press Alt+Shift+L on a site, counter pops in, drag and resize. Real Chrome. | 5–8 s |
