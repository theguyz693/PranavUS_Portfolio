# Lockout: Highlights

## Resume bullets
- Built a Manifest V3 Chrome extension in vanilla JavaScript (about 5,500 lines of JS, HTML and CSS) that blocks distracting sites during timed focus sessions, with four lock-in levels that progressively raise the cost of quitting (wait timer, typed no-paste pledge, frozen blocklist, no early exit).
- Implemented YouTube Shorts hiding and Shorts/Reels counting with a content script and CSS selectors, plus URL-path blocking for `youtube.com/shorts` and `instagram.com/reels`, so the rest of YouTube stays usable.
- Engineered a service-worker-safe time tracker (alarms, focus and idle events, persisted visit state, capped sleep gaps, serialized storage writes) that totals daily time on listed sites with no backend.
- Created a draggable, resizable floating counter in a closed Shadow DOM, built without `innerHTML` to satisfy Trusted Types, and summonable on any tab with Alt+Shift+L through `activeTab`, avoiding an all-sites permission.
- Replaced blanket `<all_urls>` and `webNavigation` access with six API permissions plus optional per-site access requested at runtime; all data stays in `chrome.storage.local` with no network requests.
- Designed three themes (Classic Dark, Classic Light, Industrial) on shared components with CSS variables and bundled open-source fonts; wrote Web Store assets (privacy policy, listing, icons, packaging script) and a scripted demo video rendered with Playwright and ffmpeg.

## Interview talking points

1. **Why escalating friction instead of a hard block?**
   People quit blockers in the moment of impulse, so the design target is the cost of quitting at that moment. Focused adds a pause, Locked In adds a typed pledge (paste disabled) and a longer wait and freezes the blocklist, Monk removes the in-extension exit. I was upfront that an extension cannot prevent uninstalling, so the UI says so and suggests allowing it in Incognito instead of promising more than it can deliver.

2. **Why `activeTab` and optional permissions instead of `<all_urls>`?**
   The original version asked for every site, which is a trust and store-review problem for something that only needs a few. The always-on counter asks for access only to the sites in the user's own list, and everything else uses a user gesture (shortcut or button). The tradeoff I accepted: the on-demand counter vanishes when you navigate.

3. **How do you build timers and stats in a service worker that can be killed?**
   Nothing important lives in memory. Sessions store a planned end timestamp and close lazily; the tracker persists the current visit and adds time in segments from alarm, focus and idle events, capping long gaps so sleep does not inflate totals. Because several events write the same stats, they share one serial queue. TODO: add one sentence on a real bug this caught, if you have one.
