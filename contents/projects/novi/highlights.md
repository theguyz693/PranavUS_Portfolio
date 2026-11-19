# Novi: Highlights

## Resume bullets
- Built a fully local Windows voice agent in Python (faster-whisper, Ollama with qwen2.5 3B models) that controls apps, media, PowerPoint and the browser from natural-language requests, running on a 6 GB laptop GPU.
- Designed a coordinator that splits goals into independent sub-tasks for up to 4 parallel workers, each with its own headless Playwright browser, plus a shared screen lock for desktop actions. Measured about 3× model throughput for 4 simultaneous calls after enabling Ollama parallelism.
- Implemented screen Q&A that combines Windows OCR (exact text) with a local vision model (qwen2.5vl) for a snip-to-ask overlay, selected-text explanations and follow-up questions.
- Added persistent SQLite memory and teachable workflows (taught by spoken instructions or recorded demonstration, replayed via Windows UI Automation by control name), with an in-app viewer to edit and delete them.
- Raised reliability of a small local model by routing common intents to deterministic fast paths, and by adding loop guards, plan-completion nudges and document-safety checks; covered by 63 offline pytest tests.
- Built an animated pixel-art desktop character, worker sprites and a task panel in Tkinter, driven by an event bus, plus a scripted demo that records itself (screen + system audio) to MP4.

## Interview talking points
1. **Fast paths vs. "let the LLM decide everything."**
   A 1B intent router and a 3B agent misrouted everyday requests: "pause" became "volume up", and a to-do list was answered as small talk. I kept the agent for open-ended work but put deterministic routing in front for high-frequency intents.
   *Why:* users judge an assistant on the common cases. A rule that always works beats a model that works most of the time, and it also cuts latency because no model call is needed.

2. **Why safety checks look at the document, not at who opened it.**
   During testing, the agent typed into an existing file. Windows 11 Notepad had restored that file into what looked like a newly opened window.
   *Why:* "the agent opened this window" turned out to be an unreliable signal. So the rule became: type freely only into a blank document, or one Novi itself started and whose title hasn't changed; otherwise ask first. Risky clicks always ask.

3. **Why workers browse headlessly instead of using the real screen.**
   There's one mouse and keyboard, so parallel desktop automation would collide.
   *Why:* giving each worker its own headless Chromium and API tools lets research truly run in parallel. A screen lock serialises anything that touches real apps, and the real limit becomes GPU memory, which I tuned through Ollama's parallel setting.
