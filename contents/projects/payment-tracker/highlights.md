# Highlights

## Resume bullets
- Built and deployed a full-stack personal finance app with Next.js 15, React 19, TypeScript and MongoDB Atlas on Vercel. It covers recurring payments, cash flow, goals, loans/EMIs, investments with FIFO lots and XIRR, and a cash-flow forecast.
- Designed an exactly-once event pipeline on MongoDB without a message queue: a unique index per provider event, 30-second leases, transactional processing with an audit trail, exponential-backoff retries and crash recovery.
- Implemented idempotency keys (payload hash + lease + TTL) for user actions, so a double-clicked "Accept & pay" records one payment and the repeat replays the stored result.
- Added an API protection layer: session checks on every server action, MongoDB-backed rate limits per user and action, HMAC-signed webhooks with a 5-minute replay window, Zod validation and structured logs with hashed user ids.
- Wrote 123 unit tests and 47 integration tests against a real MongoDB replica set, covering duplicates, injected failures, crashes, concurrent sells and stale edits.
- Built a monitoring dashboard (throughput, duplicates prevented, retries, average and p95 processing time, rate-limit rejections) from stored data, plus a scripted, narrated end-to-end demo video.

## Interview talking points
1. **Why MongoDB instead of Redis or a queue for idempotency and retries?**
   The app already ran on Atlas, which supports multi-document transactions. Keeping the idempotency record in the same database as the ledger means the payment and its "completed" marker commit atomically. With Redis I'd have two systems that can disagree after a crash. The cost is latency and cron-driven retries, which is fine at this volume. I'd revisit it with a real queue at high throughput.

2. **Why leases instead of a "processing" flag or a lock?**
   On serverless, a function can be killed at any point and never clean up. A plain flag or lock would leave the event stuck forever. A lease has an expiry, so the recovery worker can safely take over an abandoned event. Because processing is transactional, the crashed attempt left nothing half-written. The demo shows this: attempt 1 abandoned, attempt 2 processed, the payment applied once.

3. **Why split failures into business and transient?**
   Retrying "you can't sell 25 units when you own 10" just fails five times and adds noise. A dropped database connection is likely to succeed on retry. So business errors (`UserError`) go straight to FAILED with a readable reason. Everything else goes to RETRY_PENDING with exponential backoff and a cap of 5 attempts, and anything that exhausts its retries is visible in the event console rather than silently dropped.
