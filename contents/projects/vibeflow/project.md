# VibeFlow

**Pitch:** Fullscreen 3D lyric and album-art visuals that react to your Spotify playback.

## What it is
VibeFlow is a visual companion for Spotify, not a music player. It signs in to your Spotify account, reads what is currently playing, and turns it into a fullscreen experience: animated scenes, a 3D iPod-style player, and several synced-lyric visuals built around a spinning record. It runs as a desktop (Electron) app and as a web build deployed on Vercel.

## Stack
- React 19, TypeScript, Vite (web build) and electron-vite (desktop shell)
- three.js with @react-three/fiber, @react-three/drei, @react-three/postprocessing
- opentype.js (3D glass lettering from font outlines), Inter and Bagel Fat One via fontsource
- Spotify Web API with OAuth PKCE (no backend)
- LRCLIB (lrclib.net) for time-synced lyrics
- Custom k-means colour extraction from album art
- Vercel (static hosting with an SPA rewrite)

## The hardest problem I solved, and how
Making synced lyrics read clearly and stay in time inside 3D scenes.
- **Timing:** Spotify is polled every 3 seconds, so each visual interpolates the track position between polls (last `progress_ms` plus time elapsed since it arrived) to switch lines on time.
- **Blocked lyrics:** in the floating-screens visual the album-art player screen could sit between the camera and the lyric screen. A general check now fades out any screen on the line between the camera and the screen being filmed.
- **Glass lettering:** to get see-through 3D type I build letters from real font outlines (opentype.js to extruded, heavily bevelled geometry with smooth normals) and give them a transmission/dispersion material. Fully clear glass vanished over coloured backdrops, so the final material is slightly frosted.

## Result / outcome
- Vercel project "vibeflow" linked to the GitHub repo, with the live URL below (seen in the Vercel dashboard; a successful production build was not verified by me).
- Four lyric visuals (Editorial, Reel 3D, Disc Reel, Floating Screens) plus the 3D iPod player and the Spotify Companion (scenes and lyric overlays), all in the one app.
- TODO: real outcome numbers (users, visits, performance measurements). None exist in the repo, and the README's "60 FPS" claim was not measured in our work.
- TODO: confirm whether visitors to the live site can sign in with Spotify (the redirect URI for the live domain must be registered in the Spotify developer dashboard; Spotify apps in development mode may restrict who can log in).

## Links
- Repo: https://github.com/theguyz693/vibeflow (TODO: confirm it is public before linking)
- Live: https://vibeflow-ivory.vercel.app

## Status
in progress

## Known gaps (from our work)
- The Spotify-connected path was not tested during our sessions (no Spotify account was connected on the dev machine); the lyric visuals were checked in their built-in demo mode.
- The default 3D font covers Latin letters only, so lyrics in other scripts do not show in the 3D visuals.
- TODO: credit/licence for the 3D iPod model `public/models/mp3_player.glb` (source not recorded in the repo).
