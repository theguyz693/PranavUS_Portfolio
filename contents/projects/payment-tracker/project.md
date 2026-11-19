# Payment Tracker

**Personal finance tracker with a reliable, duplicate-proof payment event pipeline.**

## What it is
A web app for tracking personal money: bills and recurring payments, money you're owed, cash flow, savings goals, loans and EMIs, investments and a cash-flow forecast. Each user signs in and sees only their own data. It also has an Integrations Hub where simulated payment and broker providers (Google Pay, PhonePe, Groww, autopay and payment-request simulators) send signed events through a pipeline built so that a payment is never recorded twice, even with repeat deliveries, double clicks or a server crash mid-processing. The providers are simulators; no real bank, UPI or broker connections, and no real money.

## Stack
- **Framework:** Next.js 15 (App Router, server components, server actions), React 19, TypeScript
- **Database:** MongoDB Atlas via the official driver, using multi-document transactions
- **Auth:** Better Auth (email/password, database sessions)
- **Validation:** Zod
- **UI:** Tailwind CSS v4, Recharts, motion, Phosphor icons; three.js / React Three Fiber for the 3D landing page
- **Tests:** Vitest (unit tests plus integration tests against a real MongoDB)
- **Hosting:** Vercel (serverless functions + Vercel Cron)

## Hardest problem I solved
**Making payment processing exactly-once on serverless, with no message queue.** Webhooks can arrive twice, users double-click "Pay", and a serverless function can die halfway through. Any of these could record the same payment twice or leave half-written data.

How I solved it, using only MongoDB:
- **Idempotency keys** for user actions: each request stores a hash of its payload plus a short lease. A repeat with the same key replays the stored result; the same key with a different payload is rejected. The operation and its "completed" marker commit in one transaction.
- **One stored record per provider event:** a unique index on (user, provider, event id) means a repeat delivery is counted as a duplicate and never processed again.
- **Lease-based claiming:** a worker atomically moves an event from RECEIVED to PROCESSING with a 30-second lease. If the worker crashes, the lease expires and a recovery job picks the event up again.
- **All-or-nothing processing:** the ledger change, the status update and an audit entry are written in a single transaction, so a failure leaves nothing behind.
- **Failure classification:** business-rule failures (e.g. selling more units than owned) fail immediately; transient failures retry with exponential backoff (15 s doubling, capped at 15 min, max 5 attempts). Failures are never silently swallowed.
- Every one of these cases is covered by integration tests that run against a real MongoDB replica set.

## Result / outcome
- 123 unit tests and 47 integration tests (real MongoDB) passing
- Deployed and publicly reachable on Vercel
- Scripted, narrated demo video (8:17) recorded end to end against a test database: duplicate resend blocked, injected failure retried once, crash recovered, double-click accept recorded once, rate limit triggered
- A simulated UPI event was processed in about 60 ms in local testing (informal, single observation)
- TODO: number of real users or usage data, if any
- TODO: production performance figures (p95 processing time from the monitoring page on the live site)

## Links
- **Repo:** https://github.com/theguyz693/payment_tracker
- **Live:** https://paymenttracker-ashen.vercel.app (sign-up required for the app itself)
- **Demo video:** TODO: link to the uploaded demo video

## Status
finished. TODO: confirm. The app is deployed and working. The scheduled retry worker on the live site only runs once `CRON_SECRET` is set in Vercel.
