# Crowd-Aware Evacuation Planner

**Pitch:** Plans building evacuations that account for crowds, fire and smoke, tested on simulation.

*(Working title from the team's paper: "Crowd-Aware Indoor Evacuation Planning with Look-Ahead Capacity Booking and Hybrid Machine Learning". Repo name: capstoneML-dev. TODO: confirm the title you want on the site.)*

## What it is
A capstone research project (Team 212, four students, with a faculty supervisor) that decides which exit each person in a building should use during a fire. Instead of sending everyone to their nearest exit, it books capacity on corridors, doors and stairs ahead of time, so crowds don't pile up and people avoid smoke. It is a seeded evacuation simulator, several routing methods compared on it, a machine-learning model that predicts how long each corridor, door or stair crossing takes, and two web dashboards.

## Stack
Python, NetworkX, NumPy, pandas, SciPy, scikit-learn (Random Forest), LightGBM, FastAPI, Uvicorn, Matplotlib, HTML/JS dashboards (3D campus view and a "Research Lab" page). Optional: JuPedSim and Shapely for a cross-check.

## The hardest problem I solved, and how
TODO: confirm which problem was yours and hardest. Best-documented candidate: making the ML delay model trustworthy on real people. A pure ML model trained on simulator output scored 2.93 s error on simulated data but 7.16 s on real crowd measurements (Juelich experiments, 1,813 crossings). Fix: calibrate the simulator on the real data, then have ML learn only a *correction factor* on top of a physics formula (hybrid model "v3"). Real-data error fell to 2.12 s (physics formula alone: 2.23 s).

## Result / outcome
All numbers come from the project's own docs (`docs/final_results.md`, `docs/ml_v3.md`, `docs/validation.md`, `docs/scalability.md`), produced by seeded simulations (campus: 10 scenarios x 6 methods x 30 paired seeds; 2,766 runs).
- Look-ahead capacity planning beat the shortest-safe-path baseline significantly in 8 of 10 campus scenarios (Holm-corrected Wilcoxon). Best cases: last person out about 36% sooner (200 people on floor 3: 367 s to 234 s).
- Spreading fire, 200 people on floor 3: people exposed to smoke fell from 109 to 25.
- ML crossing-time error on held-out simulated data: 4.76 s (formula) to 2.41 s (ML), over 784,014 simulated crossings.
- Simulator door flow reached 98%-122% of lab measurements after calibration (32%-38% with handbook values).
- Transferred to a second, different building (100-bed oncology hospital, 124 nodes): faster walking-crowd exit in 6 of 6 scenarios.
- Honest finding: the gain comes from coordination (capacity booking), not prediction accuracy.
- Planner speed: 1.06 s per re-plan for 2,000 people on the 452-node campus; over the 5 s budget for the largest synthetic towers.
- TODO: publication status (the summary sheet's "Publication" field is blank), and any grade or award.

## Links
- Repo: https://github.com/theguyz693/capstoneML-dev (from the git remote). TODO: confirm it is public before linking.
- Live: TODO: none known (needs a Python server; see glimpse-plan.md).

## Status
in progress (latest commit: "Phase 2.8: one-command reproduce_all, building pack"). TODO: change to "finished" if the capstone is closed.

## My role
TODO: what you personally built. The summary sheet lists four team members: Nishant Trivedi, Raghu Vamshi, Skanda R, Pranav U S.
