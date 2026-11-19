import { lazy, Suspense, useMemo, useState } from 'react'
import { defaultPalette } from './vibeflow/services/themeEngine'
import { buildLines, DEMO_LYRICS } from './vibeflow/services/lyricAnalysis'

const MODES = [
  { id: 'editorial', label: 'Editorial', C: lazy(() => import('./vibeflow/components/LyricVoid')) },
  { id: 'reel', label: 'Reel 3D', C: lazy(() => import('./vibeflow/components/lyric-reel/LyricReel')) },
  { id: 'disc', label: 'Disc Reel', C: lazy(() => import('./vibeflow/components/lyric-hype/LyricHype')) },
  { id: 'screens', label: 'Floating Screens', C: lazy(() => import('./vibeflow/components/lyric-screens/LyricScreens')) },
] as const

// No Spotify: the visuals fall back to their built-in sample lyrics, exactly as the app does when nothing is playing.
const noop = async () => {}
const SPOTIFY = { isLoggedIn: false, currentTrack: null, volume: 50, togglePlay: noop, skipNext: noop, skipPrev: noop, changeVolume: noop }

export default function VibeDemo() {
  const [started, setStarted] = useState(false)
  const [mode, setMode] = useState<(typeof MODES)[number]['id']>('reel')
  const colors = useMemo(() => defaultPalette(), [])
  const lines = useMemo(() => buildLines(DEMO_LYRICS).filter((l) => !l.dots), [])
  const Active = MODES.find((m) => m.id === mode)!.C

  return (
    <div className="demo">
      <p className="mono demo-note">The app&apos;s own 3D lyric visuals, running on sample lyrics (no Spotify). One WebGL canvas at a time. Needs a desktop GPU; heavy on phones.</p>
      {!started ? (
        <div className="vibe-start">
          <button className="btn on" onClick={() => setStarted(true)}>Start the demo</button>
          <p className="mono dim">loads three.js visuals on demand</p>
        </div>
      ) : (
        <>
          <div className="demo-row">
            {MODES.map((m) => <button key={m.id} className={`btn small ${m.id === mode ? 'on' : ''}`} aria-pressed={m.id === mode} onClick={() => setMode(m.id)}>{m.label}</button>)}
            <button className="btn small" onClick={() => setStarted(false)}>Stop</button>
          </div>
          <div className="vibe-stage">
            <Suspense fallback={<p className="mono dim vibe-load">loading visual…</p>}>
              <Active key={mode} spotify={SPOTIFY} colors={colors} />
            </Suspense>
          </div>
        </>
      )}
      <h4 className="mono">chorus detection: repeated lines are marked</h4>
      <ol className="vibe-lines mono">
        {lines.map((l, i) => <li key={i} className={l.chorus ? 'chorus' : ''}>{l.text}{l.chorus && <span> · chorus</span>}</li>)}
      </ol>
    </div>
  )
}
