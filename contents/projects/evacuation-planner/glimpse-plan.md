# Glimpse plan

## Recommendation: small interactive demo (recorded loop as fallback)
- **Live iframe:** no. The real app needs a Python server (FastAPI plus scikit-learn/LightGBM models), and no hosted version is known. TODO: confirm none exists.
- **Recorded loop:** works, and recordings exist (`docs/demo/evacuation_demo.mp4`, 8 MB; `Team212_Demo.mp4`, 27 MB). But the point of the project is comparing methods under crowds, which a visitor grasps faster by switching methods themselves.
- **Interactive demo:** best fit, if built from precomputed data so no server is needed.

## Demo: "Race the routing methods"
**What the visitor sees:** a 2D plan of one floor of the campus (or the hospital) with dots for people, a fire zone and exits. Two panels run the same crowd side by side: left "nearest exit", right "look-ahead planner". A scoreboard shows people still inside, last-out time and people exposed to smoke.

**What they click and learn:**
1. Pick a scenario (e.g. "200 people on floor 3", "250 spread, spreading fire"). Learns that crowds, not distance, cause the delay.
2. Press play: the left side jams at one stairwell, the right side spreads people across exits. Learns why coordination wins.
3. Choose methods to compare (nearest, shortest safe, reactive, look-ahead). Learns that nearest exit can be fast but walks people through fire (exposed count).
4. Toggle "60% follow guidance" and the safety dial. Learns the tradeoffs.
5. Click a spot to see a kiosk sign (arrow plus time-to-exit range).

**Data and logic it needs (all in the browser, no server):**
- Precomputed replays exported from the simulator per scenario/method/seed: positions per tick, fire zone per tick, queue counts. TODO: write an export script; the Research Lab already replays runs, so check `research_server.py` and `research.html` for the replay format.
- Floor geometry (nodes/edges, plan image or drawn lines) from `buildings/*.json`.
- Scoreboard numbers, computed from the replay or copied from `results/*.csv`.
- A small canvas player (play/pause/speed) and scenario/method selectors. Keep to 4-6 scenarios to stay small.
- No live planning needed; every result is a stored, seeded run.

## Fallback recording: shot list (about 12 s, muted loop)
Source: `docs/demo/evacuation_demo.mp4` or a fresh capture of the Research Lab. TODO: check timestamps in the existing video.
1. **Scenario picker (2 s):** choose "200 on floor 3".
2. **Race (4 s):** side by side, nearest exit jams, planner spreads people.
3. **Scoreboard (2 s):** last-out time and people-inside curve diverge.
4. **Fire scenario (2 s):** exposed count is higher for the baseline.
5. **Kiosk sign (2 s):** arrow with time-to-exit range.
