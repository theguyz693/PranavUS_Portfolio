import { useEffect, useRef, useState } from 'react'

type Level = 'Chill' | 'Focused' | 'Locked In' | 'Monk'
const LEVELS: { name: Level; gate: string }[] = [
  { name: 'Chill', gate: 'End any time' },
  { name: 'Focused', gate: 'Wait 15 s, then end' },
  { name: 'Locked In', gate: 'Type a pledge (no paste), then wait' },
  { name: 'Monk', gate: 'No way out until the timer ends' },
]
const SAMPLE_BARS = [40, 65, 20, 80, 55, 90, 30] // sample data, labelled as such
const GATE_WAIT = 5 // seconds shown; the real wait is 15 s, sped up for the demo
const PLEDGE = 'I choose to quit'

type Page = 'home' | 'reddit' | 'video' | 'article'

export default function LockoutDemo() {
  const [level, setLevel] = useState<Level>('Focused')
  const [minutes, setMinutes] = useState(25)
  const [left, setLeft] = useState<number | null>(null) // seconds
  const [page, setPage] = useState<Page>('home')
  const [gate, setGate] = useState(false)
  const [wait, setWait] = useState(GATE_WAIT)
  const [pledge, setPledge] = useState('')
  const [hideShorts, setHideShorts] = useState(false)
  const [streak, setStreak] = useState(6)
  const tick = useRef<number | undefined>(undefined)

  const locked = left !== null
  useEffect(() => {
    if (!locked) return
    tick.current = window.setInterval(() => setLeft((s) => (s === null ? s : Math.max(0, s - 1))), 1000)
    return () => clearInterval(tick.current)
  }, [locked])
  useEffect(() => {
    if (left === 0) { setLeft(null); setGate(false); setStreak((s) => s + 1) }
  }, [left])
  useEffect(() => {
    if (!gate) return
    setWait(GATE_WAIT); setPledge('')
    const t = window.setInterval(() => setWait((w) => Math.max(0, w - 1)), 1000)
    return () => clearInterval(t)
  }, [gate])

  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const canEnd =
    level === 'Chill' ? true :
    level === 'Focused' ? wait === 0 :
    level === 'Locked In' ? wait === 0 && pledge.trim().toLowerCase() === PLEDGE.toLowerCase() : false

  const blocked = locked && page === 'reddit'

  return (
    <div className="demo">
      <p className="mono demo-note">Interactive re-creation in your browser. Stats are sample data. Gate waits are sped up. Shorts counter not included yet.</p>
      <div className="demo-cols lockout">
        <section aria-label="Extension popup" className="popup">
          <h4 className="mono">popup · sample data</h4>
          <p className="mono">streak {streak} days · focus today 1h 25m · Shorts scrolled 41</p>
          <div className="bars" aria-hidden>{SAMPLE_BARS.map((h, i) => <span key={i} style={{ height: `${h}%` }} />)}</div>
          {!locked ? (
            <>
              <div className="demo-row">
                {LEVELS.map((l) => (
                  <button key={l.name} className={`btn small ${l.name === level ? 'on' : ''}`} onClick={() => setLevel(l.name)}>{l.name}</button>
                ))}
              </div>
              <p className="mono dim">{LEVELS.find((l) => l.name === level)!.gate}</p>
              <label className="mono">duration{' '}
                <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
                  {[15, 25, 45].map((m) => <option key={m} value={m}>{m} min</option>)}
                </select>
              </label>
              <div className="demo-row"><button className="btn on" onClick={() => setLeft(minutes * 60)}>Lock In</button></div>
            </>
          ) : (
            <>
              <p className="timer">{mmss(left!)}</p>
              <p className="mono dim">{level} lock-in running</p>
              <div className="demo-row">
                <button className="btn small" onClick={() => setLeft((s) => Math.max(1, (s ?? 0) - 600))}>fast-forward 10 min</button>
                {level !== 'Monk' && <button className="btn small" onClick={() => setGate(true)}>End lock-in</button>}
              </div>
            </>
          )}
          {gate && locked && (
            <div className="gate" role="dialog" aria-label="End lock-in">
              {level === 'Chill' && <p>Ending now.</p>}
              {level === 'Locked In' && (
                <label className="mono">Type “{PLEDGE}” to continue
                  <input className="qa" value={pledge} onChange={(e) => setPledge(e.target.value)} onPaste={(e) => e.preventDefault()} />
                </label>
              )}
              {level !== 'Chill' && <p className="mono">{wait > 0 ? `wait ${wait} s (real: 15 s)` : 'wait done'}</p>}
              <div className="demo-row">
                <button className="btn small" disabled={!canEnd} onClick={() => { setLeft(null); setGate(false) }}>End lock-in</button>
                <button className="btn small" onClick={() => setGate(false)}>Keep going</button>
              </div>
            </div>
          )}
        </section>

        <section aria-label="Mock browser" className="browser">
          <h4 className="mono">mock browser</h4>
          <div className="demo-row">
            {(['reddit', 'video', 'article'] as Page[]).map((p) => (
              <button key={p} className={`btn small ${page === p ? 'on' : ''}`} onClick={() => setPage(p)}>{p === 'reddit' ? 'reddit.com' : p === 'video' ? 'a video site' : 'an article'}</button>
            ))}
          </div>
          <div className="viewport">
            {page === 'home' && <p className="mono dim">pick a page above</p>}
            {page === 'reddit' && (blocked
              ? <div className="calm"><p className="serif-lg">Not now.</p><p className="mono">streak {streak} days · {mmss(left!)} left</p><p>No lecture. Just a pause.</p></div>
              : <p className="mono dim">reddit.com loads normally (no lock-in running)</p>)}
            {page === 'video' && (
              <div>
                <label className="mono"><input type="checkbox" checked={hideShorts} onChange={(e) => setHideShorts(e.target.checked)} /> Hide Shorts</label>
                {!hideShorts && <div className="shelf"><span>Shorts</span><i /><i /><i /></div>}
                <div className="vids"><i /><i /></div>
              </div>
            )}
            {page === 'article' && <p className="mono dim">a plain article page</p>}
          </div>
        </section>
      </div>
    </div>
  )
}
