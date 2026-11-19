# Multi-Agent Research System

**Compares three ways LLM agents coordinate to research a topic and write reports.**

## What it is
You give it a research topic. A team of AI agents searches the web, pulls out key facts, analyzes them and writes a structured report. The project runs that same job three ways (a fixed pipeline, a shared "blackboard" memory, and a critic that sends work back for revision), then scores and compares the results in a Streamlit dashboard.

TODO: my role on the team (this was a team college project) and which parts I built.

## Stack
- **Language:** Python 3.12
- **UI:** Streamlit dashboard, Plotly charts; also a command-line runner (`main.py`)
- **LLM providers (switchable in `.env`):** Anthropic Claude (original), Groq (`openai/gpt-oss-20b`, `openai/gpt-oss-120b`), Ollama running `qwen2.5:7b` locally
- **Web search:** Tavily API (with an LLM-simulated fallback when no key is set)
- **Other:** httpx, python-dotenv, pandas

## Hardest problem I solved
**Making a pipeline written for one paid API run reliably on free and local models.** The original code called the Anthropic API directly in two places and defaulted to a Claude model that has since been retired, so it couldn't run without a paid key. Switching providers exposed four separate failures:

- **No provider abstraction.** I added a small `llm_client.py` that picks Anthropic, Groq or Ollama from one `.env` setting. It exposes the same `messages.create(...)` interface the agents already used, so the agent and scoring code only changed where the client is created.
- **Silent parsing failures.** `gpt-oss-120b` writes `**Title:**` where the parser expected `Title:`, so every search result was dropped and reports were built from zero sources with no error. I made the parser ignore Markdown bold markers.
- **Truncated JSON from a reasoning model.** `gpt-oss` spends hidden reasoning tokens before answering, and they counted against the code's output limits, which were sized for Claude. The extraction JSON was cut off mid-object. I set low reasoning effort and added output headroom, on the Groq path only.
- **Free-tier rate limits.** Groq's free tier allows 8,000 tokens per minute and 200,000 tokens per day per model. The Groq client now waits and retries on per-minute limits, and stops immediately with a clear message when the daily quota is used up, since retrying can't help.

On Ollama, the client uses Ollama's native chat API so the context window can be set to 8,192 tokens; the OpenAI-compatible endpoint doesn't allow that.

## Result / outcome
Informal measurements from single runs on my laptop (RTX 3050 6 GB). These are not a benchmark: each comes from one run, and the scores are LLM-judged.
- **Full 3-strategy run with real web search** (Groq `gpt-oss-20b` + Tavily, via the dashboard): finished in 5 min 41 s with no errors.
- **Single sequential run with real web search** (Groq `gpt-oss-20b` + Tavily): 23.5 s, 4 LLM calls, 12 sources retrieved.
- **Fully local run** (Ollama `qwen2.5:7b`, simulated search, sequential strategy): 7 min 17 s, 12 LLM calls, no API key needed.
- **One comparison run** (Groq `gpt-oss-120b`, simulated search, before Tavily was added):

  | Strategy | Quality | Accuracy | Hallucination | Runtime | LLM calls |
  |---|---|---|---|---|---|
  | Sequential | 6.5/10 | 7.0/10 | 38% | 90.9 s | 12 |
  | Shared Memory | 7.8/10 | 5.0/10 | 29% | 120.5 s | 12 |
  | Critic Feedback | 7.5/10 | 3.0/10 | 53% | 338.9 s | 22 |

  The sources in this run were invented by the model, so the accuracy and hallucination numbers mostly reflect that.
- TODO: averaged results over several topics with real Tavily search (not yet run).
- TODO: grade or feedback received for the course project.

## Links
- **Repo:** TODO: no git repository in the local copy; add the GitHub link if the team published one.
- **Live:** none. TODO: decide whether to host it. A public deployment would need my API keys, would use up the free-tier quota for every visitor, and a full run takes about 6 minutes.
- **Demo video:** `C:\Research_LLM\demo\multi_agent_research_demo.mp4` (2 min 26 s, captioned, the agent wait fast-forwarded). TODO: upload it and add the link.

## Status
**Prototype.** Works end to end from the dashboard and the CLI with Groq, Ollama or Anthropic. There are no automated tests, the shared-memory strategy passes blackboard context only to the report step, and the comparison hasn't been averaged across multiple topics or runs.
