# Highlights

## Resume bullets
- Built a seeded evacuation simulator and five routing methods in Python (NetworkX, NumPy); a look-ahead capacity-booking planner cut last-out time up to 36% vs shortest-safe-path, significant in 8 of 10 campus scenarios over 2,766 runs.
- Trained a hybrid LightGBM model (physics formula x learned correction) on 784,014 simulated crossings; halved held-out error (4.76 s to 2.41 s) and reached 2.12 s error on real crowd data where pure ML scored 7.16 s.
- Calibrated the simulator on real Juelich crowd measurements, raising door flow from 32%-38% to 98%-122% of lab values, and checked stair speed against NIST drill data.
- Showed the method transfers to a second building (100-bed hospital graph, 124 nodes): faster walking-crowd evacuation in 6 of 6 scenarios; identified the ramp as the single point of failure (42 people stranded if blocked in a fire).
- Optimised the planner with A* and cached edge costs (median 5.3x faster); it re-plans 2,000 people on a 452-node campus in 1.06 s.
- Shipped FastAPI endpoints, a 3D dashboard and a research dashboard, with one-command reproduction and 13 test files. TODO: confirm which parts you personally built.

## Interview talking points
1. **"Why not just use ML?"** The pure ML model looked great on simulated data (2.93 s) but failed on real crowds (7.16 s) because it never saw, for example, 5 m corridors. Learning only a correction to a physics formula generalises. I also found the bigger win was coordination (-14.4%), not prediction accuracy (under 4%), so ML stayed optional.
2. **"Why report exposure, not only time?"** Nearest exit is sometimes fastest, but only by walking people through fire (99 exposed on average vs 1). Judging a safety system on speed alone would pick the wrong method, so every table shows both.
3. **"Why a switching threshold and honest negative results?"** Without a 15% threshold the planner is 4% faster but changes routes about 3x as often, instructions people may not follow. Likewise, the compliance study showed compliance-aware planning rarely helps, so the team kept the simple planner and reported that.
