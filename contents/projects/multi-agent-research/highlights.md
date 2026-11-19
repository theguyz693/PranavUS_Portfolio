# Multi-Agent Research System: Highlights

## Resume bullets
- Built a multi-agent research pipeline in Python with five specialized LLM agents (query generation, search, extraction, analysis, report) plus a critic, run under three coordination strategies (sequential, shared blackboard, critic feedback) for side-by-side comparison.
- Implemented a critic feedback loop that scores drafts against a 7.5/10 threshold and returns specific feedback for up to 3 revisions each of the analysis and the report.
- Built an LLM-as-judge evaluation scoring reports on quality, factual accuracy and hallucination rate, with a weighted composite (35/35/30) and per-metric winners shown in a Streamlit + Plotly dashboard.
- Added a provider layer so the same agents run on Anthropic Claude, Groq or a local Ollama model from one config setting, removing the need for a paid API key (full local run in 7 min 17 s on an RTX 3050 6 GB).
- Diagnosed and fixed model-portability bugs: a parser that silently dropped Markdown-formatted search results, JSON truncated by a reasoning model's hidden tokens, and free-tier rate limits (retry with backoff, fail-fast on daily quota).
- Integrated Tavily web search with URL de-duplication and a labelled simulated fallback; a full 3-strategy run with real search completed in 5 min 41 s.

TODO: adjust the bullets to match the parts I personally built on the team.

## Interview talking points
1. **Why compare coordination strategies instead of just building the best pipeline?**
   The question was whether the extra structure is worth its cost. All three strategies use the same agents and prompts, so differences come from how information flows. One measured run shows the price of the critic loop: 22 LLM calls and about 339 s, against 12 calls and 91–121 s for the other two. Whether that buys better reports is exactly what the evaluation is meant to show. With one run and simulated sources, it didn't show a clear quality win, which is itself worth saying.

2. **Why wrap new providers in the Anthropic interface instead of rewriting the agents?**
   Every agent and the evaluator already called `client.messages.create(...)` and read `response.content[0].text`. Copying that interface for Groq and Ollama kept the change to one new file plus the lines that create the client, and left the original Claude path untouched. The project only needs text in and text out, so a full abstraction library would have been overkill. The cost is no streaming or tool use, which aren't needed here.

3. **Why did a model switch break things silently, and what did that teach me?**
   Moving to `gpt-oss-120b` produced reports with 0 sources and no error. The model formatted labels as `**Title:**`, and the parser only matched `Title:`, so every result was dropped and the pipeline carried on. A second bug looked similar: the reasoning model's hidden tokens used up the output budget, cutting the extraction JSON short, and the code fell back to a placeholder. Both were caught by checking intermediate counts (sources retrieved, facts extracted), not the final report, which still looked plausible. Lesson: in LLM pipelines, log and check each stage's output, because the final text can look fine when the inputs were empty.
