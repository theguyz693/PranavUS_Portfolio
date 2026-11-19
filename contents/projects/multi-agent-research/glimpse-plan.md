# Multi-Agent Research System: Glimpse plan

## Recommendation: small interactive demo (a replay of a real run)
- **Live iframe:** a poor fit. The app needs my API keys on a server, every visitor would use my Groq and Tavily free-tier quota, and a full run takes about 6 minutes. Visitors would mostly watch a progress bar.
- **Recorded screen loop:** easy, since a captioned demo video already exists, but passive. The point of the project is comparing strategies, and a video can't let visitors explore that.
- **Interactive replay:** shows the actual idea in seconds with no server. It plays back a real run that was recorded earlier, so nothing is faked and it costs nothing per visitor.

## What the visitor sees and does
1. **Topic header** with the real topic of the recorded run (for example "Large Language Models in Healthcare") and a note: "Replay of a real run. No live AI calls."
2. **Three strategy cards** side by side: Sequential, Shared Memory, Critic Feedback. Each shows its flow as a row of agent nodes (Query → Search → Extract → Analyze → Report, with a Critic node looping back on the third card).
3. **Play button.** Each card animates through its stages using the real log lines from that strategy, sped up, with counters for elapsed time (scaled from the real runtime) and LLM calls.
4. **Critic rounds.** On the Critic card, each review shows its score, approved or not, and a short excerpt of the feedback, then the arrow loops back for another round. This is the most distinctive part.
5. **Results.** When all three finish, a comparison table and bar chart appear (quality, accuracy, hallucination, runtime, LLM calls), with the winner of each metric highlighted.
6. **Click a card** to open its report (rendered Markdown, collapsible), the search queries, and the source titles with links.
7. **Toggle "real search vs simulated search"** (optional, only if two recorded runs are included) to show how scores change when sources are real.

**What the visitor learns:** what each strategy does, what the critic loop costs in time and calls, and that LLM-judged scores need caveats. Each scorecard should carry a footnote: "single run, LLM-judged".

## Data it needs (all static, in the browser)
`data/run.json`, exported from one real 3-strategy run. Use the dashboard's **📦 Export All Results (JSON)** button, or `python main.py --model all --save`. Then trim it to:
- `topic`
- For each strategy: `model`, `runtime_seconds`, `total_api_calls`, `iterations`, `logs[]`, `queries[]`, `sources[]` (title and URL only), `report` (Markdown), plus `critique_history[]` for the critic (`phase`, `iteration`, `score`, `approved`, `feedback`)
- `comparison.metrics[]` (`report_quality`, `factual_accuracy`, `hallucination_rate`, `composite_score`, `runtime_seconds`, `total_api_calls`) and `comparison.summary.winners`

Logic: a timeline player that steps through `logs[]` with each strategy's runtime scaled to roughly 10–20 seconds, a Markdown renderer for reports, and a small bar chart. No API calls, keys or backend.

TODO: export `run.json` from a real 3-strategy run **with Tavily on**. The current `results.json` holds only a single sequential run, and the recorded dashboard runs weren't saved.
TODO: check the exported reports and source list before publishing; they contain whatever the web search returned.

## Fallback
If there's no time to build the replay, use a 10–15 second muted loop cut from the existing demo video. The shot list is in `media-checklist.md`.
