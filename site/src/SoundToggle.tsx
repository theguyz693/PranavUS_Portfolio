import { useEffect, useState } from 'react'
import { lofi, type Mood } from './lofi'

const KEY = 'portfolio-sound'
const read = () => { try { return localStorage.getItem(KEY) === 'on' } catch { return false } }
const write = (v: boolean) => { try { localStorage.setItem(KEY, v ? 'on' : 'off') } catch { /* private window */ } }

/** Off until asked. If it was on last visit it starts at the first click or key press (browsers block sound before that). */
export default function SoundToggle({ mood, quiet }: { mood: Mood; quiet?: boolean }) {
  const [on, setOn] = useState(false)

  useEffect(() => {
    if (!read()) return
    const go = () => { setOn(true); lofi.setMood(mood); lofi.start() }
    window.addEventListener('pointerdown', go, { once: true })
    window.addEventListener('keydown', go, { once: true })
    return () => { window.removeEventListener('pointerdown', go); window.removeEventListener('keydown', go) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { lofi.setMood(mood) }, [mood])
  useEffect(() => { lofi.duck(!!quiet) }, [quiet, on])
  useEffect(() => {
    const vis = () => { if (document.hidden) lofi.stop(); else if (on) lofi.start() }
    document.addEventListener('visibilitychange', vis)
    return () => document.removeEventListener('visibilitychange', vis)
  }, [on])

  const toggle = () => {
    const next = !on
    setOn(next)
    write(next)
    if (next) { lofi.setMood(mood); lofi.start() } else lofi.stop()
  }

  return (
    <button className="sound-toggle" onClick={toggle} aria-pressed={on} aria-label={on ? 'Turn the music off' : 'Turn the music on'} title={on ? 'Music on' : 'Music off'}>
      <span className="sound-bars" data-on={on} aria-hidden><i /><i /><i /><i /></span>
      <span className="mono">{on ? 'music on' : 'music off'}</span>
    </button>
  )
}
