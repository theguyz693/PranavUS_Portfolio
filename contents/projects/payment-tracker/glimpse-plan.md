# Glimpse plan

## Recommendation: small interactive demo (with a recorded loop as fallback)

**Why:**
- A **live iframe** is a poor fit. The app needs sign-up, the visitor would land on a login page, and the interesting part (what happens on a duplicate, a failure or a crash) can't be triggered without the hub's simulator controls.
- A **recording** shows the UI, but the hard part of this project is behaviour: what happens to an event when things go wrong. Letting the visitor break things and watch the pipeline cope explains the engineering in about 20 seconds.
- The pipeline's rules are small, pure functions (`src/lib/integrations/rules.ts`), so they can be ported to run entirely in the browser.

## Interactive demo: "Try to pay twice"

**What the visitor sees:** a single panel with three parts:
1. A **phone-style card**: "Pay Rahul ₹1,500", a **Send** button, and toggles: *Deliver twice*, *Fail first attempt*, *Crash mid-processing*.
2. A **pipeline strip** with five stages lighting up in order: Signature ✓ → Validate ✓ → Store once → Claim (lease) → Commit (transaction).
3. A **ledger** (list of recorded payments) and an **event log** (attempts, statuses, timestamps).

**What they click and what happens:**
| Action | Pipeline result | Ledger |
| --- | --- | --- |
| Send | All stages pass → PROCESSED | 1 payment added |
| Send again (same event) / *Deliver twice* | Stops at "Store once": **Duplicate blocked** | Unchanged |
| Double-click Send | Second click replays the stored result (same idempotency key) | 1 payment |
| *Fail first attempt* + Send | Commit fails → rolled back → RETRY_PENDING, countdown to retry (15 s, shown sped up) → attempt 2 PROCESSED | 1 payment, only after the retry |
| *Crash mid-processing* + Send | Stuck in PROCESSING with a 30 s lease ring (sped up) → lease expires → recovery → PROCESSED | 1 payment |
| "Sell 25 of 10 units" preset | Business rule → FAILED immediately, no retry | Unchanged |

**What they learn:** however they try (duplicates, double clicks, failures, crashes), the payment is recorded exactly once, and business errors aren't retried.

**Data and logic needed (all client-side, no server):**
- An in-memory event store: a `Map` keyed by `provider:eventId` (stands in for the unique index).
- An idempotency map: `key → {payloadHash, result}`; a repeat replays, a different payload is rejected.
- An event state machine: RECEIVED → PROCESSING (with `leaseUntil`) → PROCESSED / RETRY_PENDING / FAILED. Port from `rules.ts`: `retryDelayMs` (15 s × 2^(n−1), cap 15 min), `nextStatusAfterFailure` (business → FAILED; transient → RETRY_PENDING until 5 attempts), `isClaimable`.
- A "transaction" helper that applies the ledger change, status and audit entry together, or none of them on failure.
- A time-scale factor (e.g. 10×) so the 15 s retry and 30 s lease play out in a few seconds, with the real values shown in labels.
- Static copy: 5 stage labels, status names and one sentence per outcome.
- No real network calls, credentials or provider names beyond "simulator" labels.

## Fallback: recorded screen loop (10–15 s)
Use this if the interactive demo isn't built yet. Cut it from the narrated demo or record fresh:
1. (3 s) Simulator → **Simulate payment** → green "Processed" status.
2. (3 s) Event page → **Resend same event** → "Duplicate detected".
3. (4 s) Failure injection → "Retry pending" → attempts table showing "processed on attempt 2".
4. (3 s) Monitoring page scrolling past duplicates prevented and p95 timing.
