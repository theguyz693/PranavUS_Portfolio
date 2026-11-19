# Multi-Agent Research System: Media checklist

Save everything in `media/`. Before capturing, make sure no API keys are visible. Don't film or screenshot the `.env` file, and keep it off screen in your editor and terminal.

A captioned 2 min 26 s source video already exists at `C:\Research_LLM\demo\multi_agent_research_demo.mp4` (1280×800, wait fast-forwarded). Most of the stills and the loop can be taken from it, or re-captured from the dashboard (`python -m streamlit run app.py`).

## Screenshots (PNG, 1280×800 or larger)
| File | What to capture |
|---|---|
| `hero.png` | Dashboard after a finished run: header, the three score cards and the category winners row. |
| `setup.png` | Dashboard before a run: topic entered, all three strategies ticked, sidebar showing "✓ LLM: Groq (openai/gpt-oss-20b)" and "✓ Tavily API Key set". |
| `running.png` | Progress bar with "⏳ Running Critic Feedback...". |
| `charts.png` | The metric comparison bar chart and the runtime vs LLM calls chart. |
| `critic-rounds.png` | Critic Feedback tab, "Critic Feedback History" section showing scores, approved or not, and feedback per round. |
| `report.png` | One strategy's generated report (Executive Summary and Key Findings visible). |
| `cli-table.png` | Terminal output of `python main.py --model all` ending in the comparison table and winners. |
| `architecture.png` | TODO: export the Mermaid diagram from `architecture.md` as an image (optional). |

## Recordings
| File | What to capture | Length |
|---|---|---|
| `demo-loop.mp4` | Muted loop for the fallback glimpse, cut from the existing demo video. Shots: (1) topic typed and **Run 3 Model(s)** clicked, 3 s; (2) progress bar with the fast-forward caption, 3 s; (3) score cards and winners, 3 s; (4) critic feedback rounds, 3 s; (5) scrolling a generated report, 2 s. TODO: pick exact timestamps from the source video. | 10–15 s |
| `demo-loop.webm` | Same loop as WebM, if the site prefers it. | 10–15 s |
| `full-demo.mp4` | The full captioned demo video (copy of the existing file). TODO: decide whether to host it or link to YouTube. | 2 min 26 s |
| `poster.jpg` | First frame of `demo-loop`, used as the video poster. | still |

## Data (for the interactive glimpse)
| File | What it is |
|---|---|
| `../data/run.json` | TODO: export from a real 3-strategy run with Tavily on (see `glimpse-plan.md`); trim to the listed fields. |
