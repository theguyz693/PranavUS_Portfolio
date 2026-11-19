# Novi

**Local AI desktop agent for Windows: voice control, screen understanding, parallel workers.**

## What it is
Novi is a voice assistant that lives on the Windows desktop as an animated pixel-art robot. You speak (or type) a request and it carries it out on your PC: playing music, answering with live weather and travel times, writing notes, building PowerPoint decks, explaining anything you snip from the screen, and running routines you teach it. All AI models run locally on the laptop's GPU through Ollama.

## Stack
- **Language:** Python 3.12, Windows 11
- **Local models (Ollama):** qwen2.5:3b (agent, workers, slides), qwen2.5vl:3b (vision), llama3.2:1b (fast intent router), qwen2.5:7b (chat)
- **Speech:** faster-whisper `base.en` (speech-to-text), Windows SAPI (text-to-speech)
- **Desktop control:** Windows UI Automation (`uiautomation`), pywin32, pyautogui, PowerPoint COM automation
- **Screen understanding:** Windows OCR (`winocr`), mss screenshots, qwen2.5vl
- **Web:** Playwright (headless Chromium per worker), ddgs search, Open-Meteo (weather), OpenStreetMap Nominatim + OSRM (travel times)
- **Media:** Windows Global System Media Transport Controls (WinRT)
- **UI:** Tkinter overlays (character, worker sprites, task panel, memory viewer)
- **Storage:** SQLite (memories and workflows)
- **Tests:** pytest

## Hardest problem I solved
**Getting a small 3B model to drive a real desktop reliably and safely.** The 3B model fit fully on a 6 GB laptop GPU, but on its own it misrouted common requests (e.g. "pause" became "volume up", "next song" became a Spotify search for a song called "next song"), looped on the same tool call, quit tasks halfway while claiming success, and, during testing, typed into an open document it shouldn't have touched.

How I addressed it:
- **Deterministic fast paths before the model** for the most common requests (playback control, weather, travel, slides, notes, saved routines), so these never depend on the model guessing.
- **Agent safeguards:** a plan checklist with nudges when the model stops early, a loop guard for repeated identical calls, and an instruction never to report a failed or declined step as done.
- **Acting on controls by name**, not screen position: UI Automation finds a button by name and type, so it still works when windows move.
- **Safety rules learned from a real mistake:** after test text landed in an existing document, typing is only allowed without asking into a blank or Novi-started document. Risky clicks (send, delete, buy) need a spoken yes, and only one worker controls the mouse and keyboard at a time.

## Result / outcome
Informal measurements from development on an RTX 3050 6 GB laptop (not a formal benchmark):
- 63 offline unit tests passing (agent loop, routing, workers, screen Q&A, memory, fixes).
- Parallel workers: with Ollama set to 5 parallel requests, 4 simultaneous model calls finished in 2.3 s versus 1.8 s for a single call (about 3× the throughput of running them one at a time).
- A two-city weather comparison with two parallel workers answered in 4–6 s.
- A scripted, self-recorded demo ran 13 scenes, one per capability, all successful in one take (4 min 22 s video).
- TODO: success rate on a fixed task benchmark (not yet built).
- TODO: any feedback from other users.

## Links
- **Repo:** https://github.com/theguyz693/AI-Voice-Assistant. TODO: push the `feature/agent-workers` branch; the public repo currently shows only the original version.
- **Live:** none (a local Windows desktop app with no hosted version).
- **Demo video:** TODO: upload `demo/novi_demo.mp4` (from the project repo) and add the link.

## Status
**In progress.** Core features work. Still open: approval cards for consequential actions, a task benchmark, and live testing of the teach-by-demonstration recorder.
