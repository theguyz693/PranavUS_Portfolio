# Novi: Glimpse plan

## Recommendation: recorded screen loop
- **Live iframe:** not possible. Novi is a Windows desktop app that needs local models on a GPU, the microphone and real apps (Spotify, PowerPoint, Notepad). There is nothing to host.
- **Interactive demo:** possible only as a mock of the routing logic. It would show text decisions, not what makes the project interesting: an agent visibly acting on a desktop.
- **Recorded loop:** shows the real thing (the character reacting, parallel worker sprites, apps being driven). A full-length source video already exists: `demo/novi_demo.mp4` in the project repo (4 min 22 s, 13 scenes). Short clips can be cut from it, or re-recorded with `python demo/run_demo.py`.

## Shot list (about 13 s total, muted autoplay loop)
1. **Voice command → music (3 s):** caption "Novi, play Claude's Plan on YouTube" → YouTube video starts, character in "talking" pose. *(source ~0:08–0:14)*
2. **Parallel workers (3 s):** "Which is hotter, Delhi or Mumbai?" → two coloured sidekick robots slide out beside the character, then the answer bubble. *(source ~1:50–2:05)*
3. **Desktop action (3 s):** "Make a 3 slide PPT on photosynthesis" → PowerPoint deck appears. *(source ~2:30–2:45)*
4. **Snip-to-ask (3 s):** box dragged over the slide → answer card appears beside it. *(source ~2:55–3:15)*
5. **End frame (1 s):** character idle with the task panel open. *(source ~4:00–4:10)*

TODO: confirm the exact timestamps against the video before cutting.

Notes:
- Crop or blur the browser's tab strip and bookmarks bar: the recording shows personal tab titles.
- The full video has background music from a YouTube parody song; keep the web loop muted, or replace the audio before publishing it anywhere.
