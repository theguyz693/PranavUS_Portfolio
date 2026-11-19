# Media checklist

Save everything into `media/`. Capture against a test database and a demo account. The demo account's email, real data and any secrets must not appear on screen.

## Screenshots (1280×800 or larger, PNG)
| Filename | What to capture |
| --- | --- |
| `hero.png` | Landing page 3D hero (`/`), full viewport |
| `dashboard.png` | Overview (`/dashboard`) with sample data: owed/owing, cash flow, goals |
| `integrations-hub.png` | Integrations Hub overview with all five simulated providers connected |
| `event-processed.png` | Simulator after **Simulate payment**: green "Processed" status with timing |
| `duplicate-blocked.png` | Event page after **Resend same event**: "Duplicate detected" / trace showing the blocked repeat |
| `retry-attempts.png` | Event page attempts table: attempt 1 failed (retry pending), attempt 2 processed |
| `autopay.png` | Mandate page: failed debit, successful retry, duplicate blocked |
| `monitoring.png` | Monitoring page: duplicates prevented, retries, avg/p95 processing time, rejections |
| `poster.jpg` | First frame of the loop (for the video `poster` attribute) |

Existing captures you can reuse are in `C:\payment_tracker\demo-video\`: `01-providers-connected.png` … `08-monitoring.png`. These map to `integrations-hub`, `event-processed`, `duplicate-blocked`, `retry-attempts`, `autopay` and `monitoring`.

## Screen recordings
| Filename | What to capture |
| --- | --- |
| `demo-loop.webm` | 10–15 s silent loop following the shot list in `glimpse-plan.md` (fallback glimpse) |
| `demo-loop.mp4` | Same loop as MP4 (H.264) for Safari |
| `demo-full.webm` | Full narrated walkthrough. You already have it: `C:\payment_tracker\demo-video\idempay-gatekeeper-demo-voice.webm` (8:17). TODO: upload to YouTube or a similar host and add the link |
