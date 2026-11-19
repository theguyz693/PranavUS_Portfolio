# Highlights

## Resume bullets

- Built a Hot Wheels collection web app in React 19, TypeScript and Vite with three garage views (CSS display shelf, three.js 3D showcase, filterable grid) driven by one shared filter set.
- Wrote a Node import script against the MediaWiki API that turned the Hot Wheels Wiki's yearly release tables into a 4,041-release catalogue (471 KB JSON, about 132 KB gzipped), covered by parser tests.
- Implemented in-browser car identification: ZXing barcode decoding plus Tesseract.js OCR feeding a weighted matcher with OCR digit repair and barcode checksum validation, which explains each match and ranks the full catalogue within a 300 ms test budget.
- Standardised inconsistent product photos with a real card photo lookup by toy code, plus in-browser pixel analysis (cutout detection, flood-fill backdrop removal with a quality check) and per-item overrides.
- Built a three.js card-carousel showcase that reuses one renderer and two model slots, slides cars in 460 ms, queues rapid input and respects reduced motion.
- Hardened Supabase row-level security so users can only write items into collections they own, and covered core logic with 21 Vitest unit tests.

## Interview talking points

1. **Why OCR is treated as evidence rather than an answer.** Printed text on blister packs reads badly: glare, slanted fonts, small type. Instead of trusting one reading, the app extracts several independent clues (toy code, collector number, series, year, barcode), weights them, and shows the reasons beside each candidate. Barcodes are trusted but not as proof of the exact colour variant, because one barcode can cover several variants. The user always confirms, which matters more than speed for a collection people care about.

2. **Why a static catalogue file instead of a database.** The app had to work with no backend at all (demo mode, portfolio demos, offline). A compact JSON file, with image URLs stored as short paths and rebuilt in the client, keeps it around 132 KB gzipped, cacheable, and versioned with the code. The cost is a manual refresh script and no server-side search, which I'd revisit if the catalogue grows to include premium lines.

3. **Why the 3D showcase keeps one scene instead of re-rendering per car.** Rebuilding a WebGL scene on every click causes flicker and memory churn. Keeping one renderer with two copies of the model lets the outgoing and incoming packages be visible at the same time for a horizontal carousel slide, while only a texture changes per car. The details panel switches on the same click, and queued input means fast clicking can't leave two animations fighting.
