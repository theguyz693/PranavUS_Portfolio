# VibeFlow: highlights

## Resume bullets
- Built VibeFlow, a Spotify visual companion in React 19, TypeScript and three.js (react-three-fiber) that turns the current track into fullscreen 3D visuals, shipped as an Electron desktop app and a Vercel-hosted web build.
- Implemented Spotify OAuth PKCE sign-in with token refresh and 3-second playback polling in a backend-free client app.
- Added time-synced lyrics (LRCLIB) with progress interpolated between polls, driving four lyric visuals (Editorial, Reel 3D, Disc Reel, Floating Screens) from one shared lyric timeline.
- Wrote a repeated-line chorus detector that drives glow and disc speed, so visuals have a calm baseline and a clear peak. (TODO: accuracy not measured.)
- Built 3D glass lettering from font outlines (opentype.js to extruded, bevelled, smooth-shaded geometry) with a transmission and dispersion material, used in two visuals.
- Built a 3D iPod-style player: the screen plane is sized from the model's front-face geometry, and a canvas texture shows now-playing and synced lyrics with click-wheel controls.

## Interview talking points
1. **Keeping lyrics in time with a polled API.**
   The app polls Spotify every 3 seconds, which is too coarse for lines that change every couple of seconds. I take the last reported position and add the time since it arrived, so lines switch on time between polls. I chose this over polling faster to stay light on the API and simple (no server).
2. **Cutting effects to get a product-quality design.**
   My first 3D versions animated everything at once: camera shake, colour flashes, mixed entrance styles. Reviewing it as a design problem, the issue was no hierarchy. I moved to one type system, one motion curve and a quiet baseline, and gave only chorus lines extra energy. The earlier versions are kept as separate options, so the choice was about focus, not deleting work.
3. **Glass text that is actually readable.**
   I built letters from real font outlines instead of the stock three.js font so I could use any TrueType font and control the bevel. Fully transparent glass disappeared over coloured backdrops, so I added a slight frosting and put opaque colour shapes behind the Reel 3D lyrics for the glass to refract. The tradeoff is glyph coverage: the default font only has Latin letters.
