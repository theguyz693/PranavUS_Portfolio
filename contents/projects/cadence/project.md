# Cadence

**Productivity web app for routines on 1–20 day cycles, plus tasks, goals and focus.**

## What it is
Cadence is a full-stack web app for keeping habits that are not daily. A routine repeats on a cycle you design (every day, every other day, a 7-day Push/Pull/Legs split, a 10-day training block), and the Today screen always shows what to do next. It also has one-off tasks, goals with steps, a calendar that imports Google/Outlook/Apple calendars, and a "Lock In" focus timer. A no-signup demo runs the whole app in the browser.

## Stack
- **Frontend:** React 19, Vite 8, React Router 7, lucide-react, plain CSS (design tokens, native CSS nesting)
- **Backend:** Node.js, Express 5, JWT auth, bcrypt, google-auth-library (Google sign-in, off until a client ID is set)
- **Database:** MongoDB via Mongoose 9
- **Calendar:** node-ical (iCal import), generated iCal feed (export)
- **Hosting:** Vercel (static frontend + Express app as a serverless function under `/api`)
- **Tests:** Node's built-in test runner (`node --test`), 19 tests
- **Tooling:** Playwright-core + ffmpeg script that records the demo video

## Hardest problem I solved
**Nine complete visual themes on one component tree, without forking components.** Each theme (Software/Modern Dark default, Hearth, Cyberpunk, Claymorphism, Organic, Playful Geometric, Sketch, Industrial, Retro) came from a separate design spec with its own colours, fonts, radii, shadows and motion. They had to restyle every screen, including the full-screen focus timer, and switch live.

How:
- **One token layer.** Components only read semantic CSS variables (`--surface`, `--accent`, `--radius-lg`, ...). A theme is a file that sets those tokens on `html[data-ui="<theme>"][data-theme]`, plus a nested block of component overrides.
- **Specificity planned up front.** Theme tokens sit at specificity (0,2,1) so they always beat the base accent rules at (0,2,0), with no `!important`.
- **The focus timer refactored to variables.** It was hard-coded dark; its colours became `--fm-*` variables so each theme can restyle the clock (a TIMER.EXE window in Retro, a recessed gauge in Industrial).
- **Fonts on demand.** A theme registry lists each theme's Google Fonts, which load only when that theme is picked; a pre-paint script in `index.html` sets the theme before React renders, so there is no flash.
- **Verified in the browser.** Every theme was checked on real screens in demo mode; contrast bugs found that way (unreadable text on dark banners, title bars) were fixed per theme.

## Result / outcome
- Deployed and running at the live link below.
- TODO: usage numbers (users, sessions), if any exist.
- TODO: any feedback or results you want to cite.

## Links
- **Repo:** https://github.com/theguyz693/cadence (TODO: confirm the repo is public before linking)
- **Live:** https://cadence-delta-five.vercel.app

## Status
In progress (deployed and working; planned features such as a heatmap and challenges are not built yet)
