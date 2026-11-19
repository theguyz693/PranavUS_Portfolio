# Glimpse plan

**Choice: small interactive demo.**

Why: the most interesting parts (matching noisy text to a real catalogue, and the consistent package presentation) are pure client-side logic that already runs without a server. A live iframe of the full app would be heavy (about 2.4 MB main bundle plus 3D and OCR), would take over scrolling and arrow keys inside the portfolio page, and there's no deployed URL yet. A recording would show the 3D but not let visitors try the matching.

## What the visitor sees

A compact panel with two parts:

1. **"Identify a car"**
   - A text box pre-filled with noisy OCR-style text, e.g. `WARNING CHOKING HAZARD ~~ Mazda Autozarn ## HW DREAM GARAGE 3/5`, plus 3–4 example chips (a clean toy code like `HRY93`, a name only like `Porsche 911`, a garbled read).
   - As they type, a ranked list of up to 6 candidates appears. Each shows the package card, a confidence badge (high/medium/low with a score) and the reasons ("Product code HRY93 found", "Name words matched: mazda, autozam", "Series # 3/5").
   - **What they learn:** the app reads messy text, explains its guesses, and offers several options when unsure instead of auto-adding.
2. **"Browse the garage"**
   - 6 sample cars in the package frame, with left/right arrows that slide cars like the showcase carousel. The name, series, year and toy code update in sync.
   - **What they learn:** the visual side, with every car in one consistent frame.

## Data and logic needed (self-contained)

- `evidence.ts` and `matcher.ts` from the repo, used as-is (pure TypeScript, no DOM, already unit-tested).
- A catalogue slice: about 300–500 rows from `public/catalog/hotwheels.json`, including every car used in the examples. This keeps the payload small.
- 6 car card images saved locally as `media/cards/*.jpg`, so the demo doesn't hotlink the wiki. TODO: confirm that reusing these card photos fits the wiki's licence/attribution; otherwise use your own photos.
- The package-frame CSS (`package-frame.css`) and a trimmed `BlisterCard` that takes a direct image URL (skip the live wiki lookup and pixel analysis).
- No OCR, camera, 3D model or network calls in the demo; text input stands in for OCR output.
- A link to the repo for the full version.
