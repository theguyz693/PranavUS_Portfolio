"""
Records the silent portfolio loop for Novi (repeatable).

Stages Novi's own windows over a plain dark backdrop, runs real features with
fake/non-personal data, records a 1280x720 crop around them, then cuts and
speeds up the waiting into a 10-20 s loop:

    media/demo-loop.mp4   H.264, no audio, 1280 wide, 24 fps
    media/demo-loop.webm  VP9, no audio
    media/poster.jpg      best frame

Run from anywhere:  python record_glimpse.py
Needs the Novi project at C:\\va with Ollama running. Changes nothing in the project:
uses a temporary demo memory database and turns speech output off.
"""

import os
import subprocess
import sys
import tempfile
import threading
import time
import types
from pathlib import Path

PROJECT = Path(r"C:\va")
OUT_DIR = Path(__file__).resolve().parent / "media"
sys.path.insert(0, str(PROJECT))
os.chdir(PROJECT)

import ui.dpi  # noqa: F401  (DPI-aware before any window/screenshot)
from ui.dpi import px
import config

WORK = Path(tempfile.mkdtemp(prefix="novi_glimpse_"))
config.MEMORY_DB_PATH = WORK / "demo.db"     # Fake demo memories only
config.ENABLE_TTS_FEEDBACK = False             # Silent: no voice output at all
config.WAKE_WORD_ENABLED = False

import imageio_ffmpeg
import mss
import tkinter as tk
from PIL import Image

from agent.coordinator import Coordinator
from agent.loop import Agent
from agent.tools import ToolRegistry
from core.memory import MemoryStore, WorkflowStep
from core.tasks import Status, task_manager
from tools.screen_qa import grab, session_for_image
from tools.web_browser import WebBrowser
from ui.memory_window import MemoryWindow
from ui.overlay import overlay
from ui.snip import AnswerCard, SnipOverlay
from ui.task_panel import TaskPanel
from ui.worker_sprites import WorkerDock

FPS = 24
W, H = 1280, 720
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
BG = "#101014"

FAKE_ERROR = """Traceback (most recent call last):
  File "C:\\demo\\shop\\cart.py", line 14, in <module>
    total = sum(item["price"] for item in cart)
  File "C:\\demo\\shop\\cart.py", line 14, in <genexpr>
    total = sum(item["price"] for item in cart)
TypeError: string indices must be integers, not 'str'"""


def gui(fn):
    """Run fn on the Tk thread and wait for its result."""
    done, box = threading.Event(), {}

    def call():
        try:
            box["v"] = fn()
        finally:
            done.set()

    overlay.call_in_gui(call)
    done.wait(10)
    return box.get("v")


class Stage:
    """Backdrop, caption and the fake 'error' window, all on the Tk thread."""

    def __init__(self, region):
        self.x0, self.y0 = region
        root = overlay.root
        sw, sh = root.winfo_screenwidth(), root.winfo_screenheight()
        # Always-on-top backdrop: nothing else on the desktop (apps, wallpaper) can show through
        self.backdrop = tk.Toplevel(root)
        self.backdrop.overrideredirect(True)
        self.backdrop.wm_attributes("-topmost", True)
        self.backdrop.configure(bg=BG)
        self.backdrop.geometry(f"{sw}x{sh}+0+0")
        self.backdrop.lift()
        self.caption = tk.Toplevel(root)
        self.caption.overrideredirect(True)
        self.caption.wm_attributes("-topmost", True)
        self.caption.configure(bg="#1c1c22")
        self.caption_label = tk.Label(self.caption, text="", fg="#f4f4f5", bg="#1c1c22", font=("Segoe UI", 15),
                                      padx=px(18), pady=px(10))
        self.caption_label.pack()
        self.caption.withdraw()
        self.error_win = None
        # Novi's character and speech bubble existed before the backdrop: raise them above it
        root.lift()
        overlay._bubble_win.lift()

    def say(self, text):
        self.caption_label.configure(text=text)
        self.caption.deiconify()
        self.caption.update_idletasks()
        self.caption.geometry(f"+{self.x0 + px(28)}+{self.y0 + H - self.caption.winfo_reqheight() - px(28)}")
        self.caption.lift()

    def hush(self):
        self.caption.withdraw()

    def show_error(self):
        self.error_win = tk.Toplevel(overlay.root)
        self.error_win.overrideredirect(True)
        self.error_win.wm_attributes("-topmost", True)   # Above the backdrop, so the snip really captures it
        self.error_win.configure(bg="#3f3f46")
        inner = tk.Frame(self.error_win, bg="#18181b")
        inner.pack(padx=1, pady=1)
        tk.Label(inner, text="  cart.py  (demo)", fg="#a1a1aa", bg="#27272a", anchor="w",
                 font=("Segoe UI", 9)).pack(fill=tk.X)
        tk.Label(inner, text=FAKE_ERROR, fg="#fca5a5", bg="#18181b", justify=tk.LEFT, anchor="w",
                 font=("Consolas", 11), padx=px(14), pady=px(12)).pack()
        self.error_win.geometry(f"+{self.x0 + px(40)}+{self.y0 + px(90)}")
        self.error_win.lift()
        self.error_win.update_idletasks()
        return (self.error_win.winfo_rootx(), self.error_win.winfo_rooty(),
                self.error_win.winfo_rootx() + self.error_win.winfo_width(),
                self.error_win.winfo_rooty() + self.error_win.winfo_height())

    def hide_error(self):
        if self.error_win:
            self.error_win.destroy()
            self.error_win = None


class Recorder:
    """Records the region as raw frames into a lossless-ish intermediate; marks moments."""

    def __init__(self, region):
        self.region = {"left": region[0], "top": region[1], "width": W, "height": H}
        self.raw = WORK / "raw.mp4"
        self.marks = {}

    def start(self):
        self.proc = subprocess.Popen(
            [FFMPEG, "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
             "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "ultrafast", "-crf", "12", str(self.raw)],
            stdin=subprocess.PIPE)
        self.running = True
        self.thread = threading.Thread(target=self._loop, daemon=True)
        self.thread.start()
        while not hasattr(self, "t0"):
            time.sleep(0.01)

    def _loop(self):
        with (mss.MSS() if hasattr(mss, "MSS") else mss.mss()) as sct:
            self.t0 = time.time()
            written = 0
            while self.running:
                shot = sct.grab(self.region)
                frame = Image.frombytes("RGB", shot.size, shot.bgra, "raw", "BGRX").tobytes()
                due = int((time.time() - self.t0) * FPS) + 1
                while written < due:          # Real-time pacing
                    self.proc.stdin.write(frame)
                    written += 1
                time.sleep(max(0.0, written / FPS - (time.time() - self.t0)))

    def mark(self, name):
        self.marks[name] = time.time() - self.t0
        print(f"  mark {name} @ {self.marks[name]:.2f}s")

    def stop(self):
        self.running = False
        self.thread.join(5)
        self.proc.stdin.close()
        self.proc.wait(60)


def mirror_character(event, task):
    """Novi's pose follows the top-level task (same mapping as the app)."""
    if task.parent_id is not None:
        return
    if task.finished:
        if task.status == Status.DONE:
            overlay.celebrate()
        return
    if task.status == Status.PLANNING:
        overlay.set_state("THINKING", "Planning…", "")
    elif task.status == Status.WORKING:
        overlay.set_state("EXECUTING", "Working…", task.message[:40])


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    store = MemoryStore(config.MEMORY_DB_PATH)
    store.add_memory("The user's favourite study playlist is lofi beats")      # Fake demo data
    store.add_memory("The user prefers dark mode")
    store.save_workflow("focus time", ["start focusing"], [
        WorkflowStep("Open neetcode.io"), WorkflowStep("Start a 25 minute timer")])

    overlay.start()
    time.sleep(1.0)
    sw, sh, cx, cy = gui(lambda: (overlay.root.winfo_screenwidth(), overlay.root.winfo_screenheight(),
                                  overlay.root.winfo_x(), overlay.root.winfo_y()))
    region = (sw - W, 0)   # Top-right: Novi, its panel (clamped to the top edge) and cards all fit
    print(f"screen {sw}x{sh}, Novi at {cx},{cy}, recording region {region}")
    stage = gui(lambda: Stage(region))
    dock = WorkerDock(overlay)
    dock.attach(task_manager)
    panel = TaskPanel(overlay, task_manager, on_talk=lambda: None, on_stop=lambda: None, dock=dock)
    panel.attach()
    task_manager.subscribe(mirror_character)
    card = gui(lambda: AnswerCard(overlay.root))
    coordinator = Coordinator(Agent(ToolRegistry()), WebBrowser)   # Final step: spoken summary, no desktop tools

    # Warm the models so the recording isn't mostly loading
    from ai import ollama_client
    # The worker model goes last so it's the one loaded when the workers start
    for model in (config.VISION_MODEL, config.AGENT_MODEL):
        try:
            ollama_client.chat(model, [{"role": "user", "content": "hi"}], options={"num_predict": 1})
        except Exception as e:
            print(f"warm-up {model}: {e}")

    overlay.set_state("IDLE", "Hi, I'm Novi", "Your local AI desktop agent")
    time.sleep(1.5)
    rec = Recorder(region)
    rec.start()
    rec.mark("intro")
    time.sleep(1.5)

    # 1) Ask → parallel workers → answer
    rec.mark("ask")
    gui(lambda: stage.say("\U0001F399  \u201cWhich is hotter right now, Delhi or Mumbai?\u201d"))
    overlay.set_state("LISTENING", "Listening…", "")
    time.sleep(1.2)
    rec.mark("workers")
    gui(lambda: stage.say("Two workers check in parallel"))
    answer = coordinator.run("Which is hotter right now, Delhi or Mumbai?")
    rec.mark("answer")
    gui(lambda: stage.say("One combined answer"))
    gui(lambda: card.show("Which is hotter?", answer, near=None, linger_ms=60000))
    overlay.set_state("TALKING", "Here's what I found", "")   # The live answer itself is in the card
    time.sleep(2.5)
    gui(card.hide)

    # 2) Snip a (fake) error → explanation
    error_rect = gui(stage.show_error)
    overlay.set_state("IDLE", "Ready", "")
    time.sleep(0.6)
    rec.mark("snip")
    gui(lambda: stage.say("Snip anything on screen \u2192 ask about it"))
    # Screenshot the main monitor explicitly: Novi's default grab() takes mss monitor #1, which on
    # multi-monitor setups can be a secondary screen (known Novi bug; project code left unchanged here)
    snipper = gui(lambda: SnipOverlay(overlay.root, lambda: grab((0, 0, sw, sh))))
    got = {}
    gui(lambda: snipper.start(lambda img, box: got.update(img=img, rect=box)))
    # The overlay centres its hint on the whole screen; move it into the recorded area
    gui(lambda: [snipper.canvas.coords(i, region[0] + W // 2, px(36)) for i in snipper.canvas.find_all()
                 if snipper.canvas.type(i) == "text"])
    time.sleep(0.5)
    ev = lambda x, y: types.SimpleNamespace(x=x, y=y)
    l, t, r, b = error_rect
    gui(lambda: snipper._press(ev(l - px(6), t - px(6))))
    for i in range(1, 15):
        gui(lambda i=i: snipper._drag(ev(l + (r + px(6) - l) * i // 14, t + (b + px(6) - t) * i // 14)))
        time.sleep(0.04)
    time.sleep(0.4)
    gui(lambda: snipper._release(ev(r + px(6), b + px(6))))
    gui(lambda: stage.say("\U0001F399  \u201cWhat's wrong here?\u201d"))
    overlay.set_state("SCREEN ANALYZING", "Looking…", "")
    rec.mark("snip_wait")
    reply = session_for_image(got["img"]).ask("What's wrong here? Answer in two short sentences.")
    rec.mark("snip_answer")
    gui(lambda: card.show("What's wrong here?", reply.full, near=got["rect"], linger_ms=60000))
    overlay.set_state("TALKING", "Found it", "")
    time.sleep(2.6)
    gui(card.hide)
    gui(stage.hide_error)

    # 3) Task panel
    overlay.set_state("IDLE", "Ready", "")
    rec.mark("panel")
    gui(lambda: stage.say("Every task, step and result in one place"))
    gui(panel.show)
    time.sleep(2.6)
    gui(panel.hide)

    # 4) Memory & routines
    rec.mark("memory")
    gui(lambda: stage.say("Remembers you and the routines you teach it"))
    window = MemoryWindow(overlay.root, store, on_run_workflow=lambda wf: None)
    gui(lambda: window.open("workflows"))
    gui(lambda: window.win.geometry(f"{px(460)}x{px(420)}+{region[0] + px(40)}+{region[1] + px(40)}"))
    time.sleep(2.4)
    gui(window.close)
    gui(stage.hush)
    overlay.set_state("IDLE", "Hi, I'm Novi", "Your local AI desktop agent")
    time.sleep(0.4)
    rec.mark("outro")
    time.sleep(1.6)
    rec.stop()

    edit(rec.raw, rec.marks)
    sys.stdout.flush()
    os._exit(0)


def edit(raw: Path, m: dict):
    """Cut the marked moments into the final loop (dead waiting is cut or sped up)."""
    workers_len = m["answer"] - m["workers"]
    segments = [
        (m["intro"], m["intro"] + 1.3, 1.0),
        (m["ask"], m["ask"] + 1.2, 1.0),
        (m["workers"], m["answer"], max(1.0, workers_len / 3.2)),   # Squeeze the parallel run into ~3 s
        (m["answer"], m["answer"] + 2.2, 1.0),
        (m["snip"], m["snip_wait"] + 0.3, 1.0),                      # The drag
        (m["snip_answer"], m["snip_answer"] + 2.4, 1.0),             # Model wait cut out
        (m["panel"], m["panel"] + 2.3, 1.0),
        (m["memory"], m["memory"] + 2.1, 1.0),
        (m["outro"], m["outro"] + 1.2, 1.0),
    ]
    parts, labels = [], []
    for i, (a, b, speed) in enumerate(segments):
        parts.append(f"[0:v]trim=start={a:.3f}:end={b:.3f},setpts=(PTS-STARTPTS)/{speed:.3f}[v{i}]")
        labels.append(f"[v{i}]")
    graph = ";".join(parts) + f";{''.join(labels)}concat=n={len(segments)}:v=1:a=0,fps={FPS},scale=1280:-2," \
                              f"format=yuv420p[out]"
    mp4 = OUT_DIR / "demo-loop.mp4"
    for crf in (24, 27, 30, 33):   # Smallest quality loss that stays under 2 MB
        subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", str(raw), "-filter_complex", graph, "-map", "[out]",
                        "-an", "-c:v", "libx264", "-profile:v", "high", "-preset", "slow", "-crf", str(crf),
                        "-movflags", "+faststart", str(mp4)], check=True)
        if mp4.stat().st_size < 2_000_000:
            break
    subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", str(mp4), "-an", "-c:v", "libvpx-vp9", "-b:v", "0",
                    "-crf", "38", "-row-mt", "1", str(OUT_DIR / "demo-loop.webm")], check=True)
    # Poster: the worker robots busy (60% into the workers segment)
    poster_t = 1.3 + 1.2 + 0.6 * workers_len / segments[2][2]
    subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-ss", f"{poster_t:.2f}", "-i", str(mp4), "-frames:v", "1",
                    "-q:v", "2", str(OUT_DIR / "poster.jpg")], check=True)
    for name in ("demo-loop.mp4", "demo-loop.webm", "poster.jpg"):
        print(f"wrote {OUT_DIR / name} ({(OUT_DIR / name).stat().st_size / 1e6:.2f} MB)")


if __name__ == "__main__":
    main()
