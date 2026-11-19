# Highlights

## Resume bullets
- Built a full-stack productivity app (React 19, Express 5, MongoDB) with routines on 1–20 day cycles, tasks, goals, a calendar and a focus timer, deployed to Vercel with the API as a serverless function.
- Designed a theme system of nine complete visual themes on one component tree using CSS design tokens and planned selector specificity, with live switching and fonts loaded on demand.
- Implemented two-way calendar integration: importing Google/Outlook/Apple calendars from iCal links (node-ical) and publishing a private iCal feed calendar apps can subscribe to.
- Wrote a rule-based natural-language quick-add parser ("gym 7am mon wed fri" → a routine on Mon/Wed/Fri at 7:00), covered by unit tests with Node's built-in test runner.
- Built a no-signup demo mode by routing the API client to an in-browser mock backend, so the full app runs on sample data with nothing sent to a server.
- Automated a 1080p product demo video with Playwright-core (CDP screencast) and ffmpeg, scripted end to end.

## Interview talking points
1. **Why demo mode lives in the API client.** I wanted visitors to try the real app, not screenshots, without creating an account or touching my database. Swapping the transport in one place (`api.js`) let every page run unchanged against a localStorage backend. The cost is keeping the mock API in step with the real one.
2. **Why calendar sync uses iCal links instead of OAuth.** OAuth would mean app review, token storage and refresh logic for each provider. A private iCal link works with Google, Outlook and Apple the same way and needs no stored tokens. The tradeoff is that import is read-only and refreshes only as fast as the provider updates the feed. For showing events next to routines, that was enough.
3. **Why themes are token layers, not component variants.** Nine separate design specs could easily have meant nine copies of the components. Making components read only semantic variables, and putting each theme's tokens at a specificity that always beats the base rules, kept one component tree. A new theme is a CSS file plus a registry entry. The risk is that theme files target class names, so I checked every theme in the browser after markup changes.
