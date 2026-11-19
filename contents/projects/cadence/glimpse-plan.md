# Glimpse plan

## Choice: small interactive demo
- **Live iframe:** possible, since the live site has a no-signup demo, but the full app is too dense at card size and would load MongoDB-backed pages for visitors who never click in. Better as a link out.
- **Recorded loop:** works as a fallback (a 1:18 recorder script already exists in the repo), but the strongest parts of Cadence are things you do: tick a day in a cycle, type a sentence and watch it parse.
- **Interactive demo:** the two core ideas run on pure, framework-free JavaScript already in the repo, so they can be rebuilt self-contained in the browser with no server.

## What the visitor sees and does
1. **A routine cycle row.** A 7-day "Strength training" cycle shown as day squares (Push, Pull, Legs, rest, Upper, Lower, rest), with today highlighted.
   - Click a past or current day to check it off or undo it. A counter updates: "3 of 5 scheduled days done this cycle".
   - Pattern buttons switch the cycle: Every day, 3× a week, Push/Pull/Legs, 10-day block.
   - They learn: a routine is a cycle of days, not a daily checkbox, and missed days can be caught up.
2. **A quick-add line.** A text field prefilled with `gym mon wed fri 7am`. Below it, the parsed result: kind (Routine / Task / Goal), title, repeat days, date, time, priority.
   - Example chips refill the field: `call mom tomorrow 6pm`, `pay rent friday !high`, `learn spanish by dec 31`.
   - They learn: you type the way you talk and Cadence works out the structure.
3. A "Try the full demo" link to https://cadence-delta-five.vercel.app.

## Data and logic it needs (all client-side)
- `src/utils/quickParse.js`: `parseQuickAdd(text, now)` (pure). It imports `addDays`, `startOfDay` and `daysBetween` from `src/utils/dates.js`, so copy those helpers too.
- Cycle presets as static data (taken from the old landing page's sequencer): `{ label, name, days: ['Push', 'Pull', 'Legs', null, 'Upper', 'Lower', null], today: 4, missed: [2] }`, with `null` meaning a rest day.
- A small formatter for time ("07:00" → "7:00 AM") and relative dates ("Tomorrow", "Fri, Nov 21").
- No network, storage or auth. State lives in component memory and resets on reload.
- Optional: one theme switch using a few colour tokens from `src/utils/uiThemes.js` (`preview` values) to show the theme system.
