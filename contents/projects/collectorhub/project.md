# CollectorHub

**Pitch:** A Hot Wheels collector's garage: scan a car, catalogue it, browse it in 3D.

## What it is

A web app for cataloguing a personal Hot Wheels collection. You can photograph or upload a car and the app reads its barcode and printed text, matches it against a built-in catalogue of 4,041 real mainline releases, and asks you to confirm before adding it. Your collection can be browsed as a lit display shelf, as a one-car-at-a-time 3D showcase, or as a grid.

## Stack

- React 19, TypeScript, Vite 6, React Router 7
- Tailwind CSS 4, Framer Motion
- three.js (3D package model, 3D logo)
- Tesseract.js (OCR) and ZXing (`@zxing/browser`, barcodes), both in the browser
- Supabase client with Postgres row-level security (schema and migrations written; not yet connected; the app currently runs in a local demo mode using browser storage)
- Node.js import script against the MediaWiki API (catalogue data)
- Vitest; pnpm + Turborepo monorepo

## Hardest problem

Making thousands of inconsistent product photos look like one consistent collectible.

Catalogue photos come from a community wiki: loose cars, carded cars, white backdrops, desks, transparent PNGs. Forcing them all into one frame made many look broken. The approach:

1. **Find the real card first.** Look up the exact release by its Mattel toy code (e.g. `HRY93`) in the wiki's file search and pick portrait images whose filename contains the code, excluding "loose"/"back" shots. Results are cached per browser. The wiki served a placeholder image to hotlinked requests, which was fixed by requesting images with no referrer.
2. **Otherwise, analyse the pixels.** Classify each photo from its border pixels: mostly transparent → cutout; one uniform colour → plain backdrop, which is flood-filled away from the edges; anything else → shown as a photo insert. A quality check rejects removals that ate the car or removed almost nothing.
3. **Let the owner override.** An explicit per-car image type plus size/position fine-tuning, instead of guessing from filenames.

All of it renders into one shared package frame, so every car has the same silhouette across the shelf, grid, scan results and detail page.

## Result / outcome

- Catalogue of 4,041 Hot Wheels mainline releases (2018–2026) imported from the Hot Wheels Wiki into a 471 KB JSON file (about 132 KB gzipped).
- 21 unit tests passing across 4 files (matcher, evidence extraction, catalogue shape, importer parser, image analysis).
- The matcher ranks the full catalogue within a 300 ms test budget.
- Informal check: 17 of 18 hand-picked 2023–2025 releases had a real card photo found by toy-code lookup.
- Informal check: on 16 sampled catalogue photos, transparent PNGs were detected as cutouts, several plain-backdrop JPEGs were cut out cleanly, and busy photos fell back to the insert style.
- Main JS bundle reduced from 2.84 MB to 2.42 MB by removing a charting library and replacing it with CSS charts (Vite build output).
- TODO: identification accuracy of photo scanning on real uploads (OCR results on uploaded photos are currently weak).
- TODO: any usage numbers once it's deployed.

## Links

- Repo: https://github.com/theguyz693/HW_db
- Live: TODO: deploy (e.g. Vercel/Netlify) and add the URL

## Status

in progress: a working prototype that runs in local demo mode; Supabase backend not yet connected; OCR scanning needs improvement.
