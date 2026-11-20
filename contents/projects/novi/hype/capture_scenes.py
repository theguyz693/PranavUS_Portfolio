"""
Step 1 of the hype video: capture Novi's real UI as clean scene clips.

Stages Novi's own windows (character, worker robots, snip overlay, answer
cards, task panel) over a #090909 stage, renders the UI at a large scale so
zooms stay sharp, runs the real features with tidy sample content, and saves:

    work/<scene>/00000.jpg ...   frames (30 fps) of a 16:10 region of the screen
    work/scenes.json             per-scene marks (times) and window rectangles

Then run compose_hype.py. Changes nothing in the Novi project (C:\\va): uses a
temporary demo memory, speech output off, and doesn't save the character position.
"""

import json
import os
import re
import sys
import tempfile
import threading
import time
import types
from pathlib import Path

HERE = Path(__file__).resolve().parent
WORK = HERE / "work"
PROJECT = Path(r"C:\va")
sys.path.insert(0, str(PROJECT))
os.chdir(PROJECT)

import ui.dpi
REAL_SCALE = ui.dpi.UI_SCALE
ui.dpi.UI_SCALE = 2.2           # Render Novi's UI big (set before any UI module is imported)
from ui.dpi import px
import config

config.MEMORY_DB_PATH = Path(tempfile.mkdtemp(prefix="novi_hype_")) / "demo.db"
config.ENABLE_TTS_FEEDBACK = False
config.WAKE_WORD_ENABLED = False

import mss
import tkinter as tk
from PIL import Image

from agent.coordinator import Coordinator
from agent.loop import Agent
from agent.tools import ToolRegistry
from core.tasks import Status, task_manager
from tools.screen_qa import grab, session_for_image
from tools.web_browser import WebBrowser
from ui.overlay import overlay
from ui.snip import AnswerCard, SnipOverlay
from ui.task_panel import TaskPanel
from ui.worker_sprites import WorkerDock

FPS = 30
H = 1080
W = H * 16 // 10                 # 1728: a 16:10 region, full screen height
STAGE = "#090909"

SAMPLE_CODE = '''def average_rating(reviews):
    total = 0
    for r in reviews:
        total += r["stars"]
    return total / len(reviews)

print(average_rating([]))

ZeroDivisionError: division by zero'''


def gui(fn):
    done, box = threading.Event(), {}

    def call():
        try:
            box["v"] = fn()
        finally:
            done.set()

    overlay.call_in_gui(call)
    done.wait(15)
    return box.get("v")


def rect_of(win):
    """Window rectangle (x, y, w, h) relative to the recording region."""
    win.update_idletasks()
    return [win.winfo_rootx() - REGION[0], win.winfo_rooty() - REGION[1], win.winfo_width(), win.winfo_height()]


class SceneRecorder:
    """Records the region to numbered JPEG frames in real time; keeps marks for the compositor."""

    def __init__(self, name):
        self.name = name
        self.dir = WORK / name
        self.dir.mkdir(parents=True, exist_ok=True)
        for old in self.dir.glob("*.jpg"):
            old.unlink()
        self.meta = {"marks": {}, "rects": {}, "cursor": []}

    def __enter__(self):
        self.running = True
        self.thread = threading.Thread(target=self._loop, daemon=True)
        self.thread.start()
        while not hasattr(self, "t0"):
            time.sleep(0.005)
        return self

    def _loop(self):
        region = {"left": REGION[0], "top": REGION[1], "width": W, "height": H}
        with (mss.MSS() if hasattr(mss, "MSS") else mss.mss()) as sct:
            self.t0 = time.time()
            n = 0
            while self.running:
                due = int((time.time() - self.t0) * FPS)
                if n <= due:
                    shot = sct.grab(region)
                    frame = Image.frombytes("RGB", shot.size, shot.bgra, "raw", "BGRX")
                    while n <= due:              # Real-time pacing (repeat if capture lagged)
                        frame.save(self.dir / f"{n:05d}.jpg", quality=95)
                        n += 1
                time.sleep(0.002)
            self.frames = n

    def mark(self, key):
        self.meta["marks"][key] = round(time.time() - self.t0, 3)

    def cursor(self, x, y, pressed):
        self.meta["cursor"].append([round(time.time() - self.t0, 3), x - REGION[0], y - REGION[1], pressed])

    def __exit__(self, *exc):
        self.running = False
        self.thread.join(10)
        self.meta["frames"] = self.frames
        SCENES[self.name] = self.meta
        print(f"  scene {self.name}: {self.frames} frames, marks {self.meta['marks']}")


def stage_backdrop():
    root = overlay.root
    sw, sh = root.winfo_screenwidth(), root.winfo_screenheight()
    bd = tk.Toplevel(root)
    bd.overrideredirect(True)
    bd.wm_attributes("-topmost", True)
    bd.configure(bg=STAGE)
    bd.geometry(f"{sw}x{sh}+0+0")
    bd.update()                  # Map the backdrop first, or it lands on top of Novi's windows
    raise_novi()
    return bd


def raise_novi(*extra):
    """Bring Novi's own windows (and any extra ones) above the always-on-top backdrop. Tk thread."""
    for win in (overlay.root, overlay._bubble_win) + extra:
        try:
            win.lift()
        except Exception:
            pass
    overlay.root.update_idletasks()


def place_character(x, y):
    """Move Novi within the region (not saved to disk)."""
    def move():
        overlay.root.geometry(f"+{REGION[0] + x}+{REGION[1] + y}")
        overlay._reposition_bubble()
        overlay._notify_moved()
        raise_novi()
    gui(move)
    time.sleep(0.2)


def mirror(event, task):
    if task.parent_id is not None:
        return
    if task.finished:
        if task.status == Status.DONE:
            overlay.celebrate()
        return
    if task.status == Status.PLANNING:
        overlay.set_state("THINKING", "Planning…", "")
    elif task.status == Status.WORKING:
        overlay.set_state("EXECUTING", "Working…", task.message[:36])


# ── scenes ─────────────────────────────────────────────────────────────────────

def scene_states():
    """Novi's moods, one after another, centred."""
    place_character(W // 2 + px(40), H // 2 - px(110))
    overlay.set_state("IDLE", "Hi, I'm Novi", "Your desktop AI agent")
    time.sleep(1.0)
    with SceneRecorder("states") as rec:
        rec.meta["rects"]["character"] = gui(lambda: rect_of(overlay.root))
        for key, state, primary, sub in [
            ("idle", "IDLE", "Hi, I'm Novi", "Your desktop AI agent"),
            ("listening", "LISTENING", "Listening…", "Go ahead"),
            ("thinking", "THINKING", "Planning…", "Splitting it up"),
            ("working", "EXECUTING", "Working…", "On it"),
            ("talking", "TALKING", "Here you go", ""),
        ]:
            rec.mark(key)
            overlay.set_state(state, primary, sub)
            time.sleep(1.6)
        rec.mark("celebrate")
        overlay.set_state("TALKING", "All done!", "")
        overlay.celebrate()
        time.sleep(1.8)
        rec.mark("end")


def scene_workers(coordinator):
    """Real parallel run; only a take whose answer agrees with the workers' numbers is kept."""
    place_character(W - px(150), px(40))
    question = "Which is hotter right now, Delhi or Mumbai?"
    card = gui(lambda: AnswerCard(overlay.root))
    for attempt in range(4):
        overlay.set_state("IDLE", "Ready", "")
        time.sleep(0.8)
        with SceneRecorder("workers") as rec:
            rec.meta["rects"]["character"] = gui(lambda: rect_of(overlay.root))
            rec.mark("listen")
            overlay.set_state("LISTENING", "Listening…", "")
            time.sleep(1.4)
            rec.mark("workers")
            answer = coordinator.run(question)
            rec.mark("answer")
            root = task_manager.recent(1)[0]
            temps = {}
            for t in task_manager.children(root.id):
                found = re.search(r"(-?\d+(?:\.\d+)?)\s*°", t.result or "")
                if found:
                    temps["delhi" if "delhi" in t.title.lower() else "mumbai"] = float(found.group(1))
            hot = max(temps, key=temps.get) if len(temps) == 2 and len(set(temps.values())) == 2 else None
            ok = bool(hot and re.search(rf"\b{hot}\b[^.]*\bhotter\b", answer, re.IGNORECASE))
            print(f"  take {attempt + 1}: workers found {temps}; answer: {answer!r} -> {'OK' if ok else 'rejected'}")
            gui(lambda: card.show("Which is hotter?", answer, near=None, linger_ms=60000))
            overlay.set_state("TALKING", "Here's what I found", "")
            time.sleep(0.4)
            rec.meta["rects"]["answer"] = gui(lambda: rect_of(card.win))
            rec.meta["question"] = question
            time.sleep(2.4)
            rec.mark("end")
        gui(card.hide)
        if ok:
            return
        time.sleep(1.0)
    raise SystemExit("No take had an answer consistent with the workers' numbers; not using a wrong answer.")


def scene_snip():
    """Cursor drags a snip over sample code; real vision answer appears beside it."""
    place_character(W - px(150), px(40))
    overlay.set_state("IDLE", "Ready", "")
    sw, sh = gui(lambda: (overlay.root.winfo_screenwidth(), overlay.root.winfo_screenheight()))

    def make_code_window():
        win = tk.Toplevel(overlay.root)
        win.overrideredirect(True)
        win.wm_attributes("-topmost", True)
        win.configure(bg="#2a2a33")
        inner = tk.Frame(win, bg="#141418")
        inner.pack(padx=1, pady=1)
        tk.Label(inner, text="  reviews.py  ·  sample", fg="#8b8b99", bg="#1d1d23", anchor="w",
                 font=("Segoe UI", 9)).pack(fill=tk.X)
        body = tk.Text(inner, bg="#141418", fg="#d4d4dc", font=("Consolas", 12), relief=tk.FLAT, bd=0,
                       padx=px(14), pady=px(10), width=38, height=SAMPLE_CODE.count("\n") + 1,
                       highlightthickness=0)
        body.insert("1.0", SAMPLE_CODE)
        body.tag_add("err", "end-2l linestart", "end-1c")
        body.tag_configure("err", foreground="#ff8a8a")
        body.configure(state=tk.DISABLED)
        body.pack()
        win.geometry(f"+{REGION[0] + px(70)}+{REGION[1] + px(70)}")
        win.lift()
        return win

    code_win = gui(make_code_window)
    time.sleep(0.6)
    card = gui(lambda: AnswerCard(overlay.root))
    ev = lambda x, y: types.SimpleNamespace(x=x, y=y)
    with SceneRecorder("snip") as rec:
        rec.meta["rects"]["code"] = gui(lambda: rect_of(code_win))
        rec.meta["rects"]["character"] = gui(lambda: rect_of(overlay.root))
        x, y, w, h = rec.meta["rects"]["code"]
        l, t, r, b = REGION[0] + x - px(10), REGION[1] + y - px(10), REGION[0] + x + w + px(10), REGION[1] + y + h + px(10)
        time.sleep(0.8)
        rec.mark("overlay")
        snipper = gui(lambda: SnipOverlay(overlay.root, lambda: grab((0, 0, sw, sh))))
        got = {}
        gui(lambda: snipper.start(lambda img, box: got.update(img=img, rect=box)))
        gui(lambda: [snipper.canvas.coords(i, REGION[0] + W // 2, px(40)) for i in snipper.canvas.find_all()
                     if snipper.canvas.type(i) == "text"])
        time.sleep(0.5)
        rec.mark("press")
        rec.cursor(l, t, True)
        gui(lambda: snipper._press(ev(l, t)))
        steps = 22
        for i in range(1, steps + 1):
            k = i / steps
            k = 1 - (1 - k) ** 3                                  # Ease-out drag
            cx, cy = int(l + (r - l) * k), int(t + (b - t) * k)
            gui(lambda cx=cx, cy=cy: snipper._drag(ev(cx, cy)))
            rec.cursor(cx, cy, True)
            time.sleep(0.03)
        time.sleep(0.25)
        rec.mark("release")
        rec.cursor(r, b, False)
        gui(lambda: snipper._release(ev(r, b)))
        gui(lambda: raise_novi(code_win))     # Closing the overlay can reshuffle the always-on-top windows
        overlay.set_state("SCREEN ANALYZING", "Looking…", "")
        rec.mark("thinking")
        reply = session_for_image(got["img"]).ask("What's the bug here? Answer in two short sentences.")
        print(f"  snip answer: {reply.full!r}")
        rec.mark("answer")

        def show_card():
            card.show("What's the bug?", reply.full, near=None, linger_ms=60000)
            cw = card.win.winfo_reqwidth()
            card.win.geometry(f"+{REGION[0] + x}+{REGION[1] + y + h + px(24)}")  # Right under the code
        gui(show_card)
        overlay.set_state("TALKING", "Found it", "")
        time.sleep(0.4)
        rec.meta["rects"]["answer"] = gui(lambda: rect_of(card.win))
        time.sleep(2.6)
        rec.mark("end")
    gui(card.hide)
    gui(code_win.destroy)


def scene_panel(panel):
    """The task panel with this session's real tasks."""
    place_character(W - px(150), H // 2 - px(60))
    overlay.set_state("IDLE", "Ready", "")
    time.sleep(0.6)
    with SceneRecorder("panel") as rec:
        rec.meta["rects"]["character"] = gui(lambda: rect_of(overlay.root))
        time.sleep(0.4)
        rec.mark("open")
        gui(panel.show)
        time.sleep(0.6)
        rec.meta["rects"]["panel"] = gui(lambda: rect_of(panel.win))
        time.sleep(2.8)
        rec.mark("end")
    gui(panel.hide)


def main():
    global REGION, SCENES
    SCENES = {}
    WORK.mkdir(exist_ok=True)
    overlay.start()
    time.sleep(1.0)
    base = gui(lambda: float(overlay.root.tk.call("tk", "scaling")))
    gui(lambda: overlay.root.tk.call("tk", "scaling", base * ui.dpi.UI_SCALE / REAL_SCALE))   # Bigger fonts too
    sw, sh = gui(lambda: (overlay.root.winfo_screenwidth(), overlay.root.winfo_screenheight()))
    REGION = (sw - W, 0)
    print(f"screen {sw}x{sh}; region {REGION} {W}x{H}; UI scale {ui.dpi.UI_SCALE}")
    gui(stage_backdrop)
    dock = WorkerDock(overlay)
    dock.attach(task_manager)
    panel = TaskPanel(overlay, task_manager, on_talk=lambda: None, on_stop=lambda: None, dock=dock)
    panel.attach()
    task_manager.subscribe(mirror)
    coordinator = Coordinator(Agent(ToolRegistry()), WebBrowser)

    from ai import ollama_client
    for model in (config.VISION_MODEL, config.AGENT_MODEL):        # Worker model last = loaded first
        try:
            ollama_client.chat(model, [{"role": "user", "content": "hi"}], options={"num_predict": 1})
        except Exception as e:
            print(f"warm-up {model}: {e}")

    scene_states()
    scene_workers(coordinator)
    scene_snip()
    scene_panel(panel)
    (WORK / "scenes.json").write_text(json.dumps({"fps": FPS, "size": [W, H], "scenes": SCENES}, indent=2))
    print(f"wrote {WORK / 'scenes.json'}")
    sys.stdout.flush()
    os._exit(0)


if __name__ == "__main__":
    main()
