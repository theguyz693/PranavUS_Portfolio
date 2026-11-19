import { useEffect, useState } from 'react'
import { lofi, type Mood } from './lofi'


const KEY = 'portfolio-music'
const muted = () => { try { return localStorage.getItem(KEY) === 'off' } catch { return false } }
const remember = (off: boolean) => { try { if (off) localStorage.setItem(KEY, 'off'); else localStorage.removeItem(KEY) } catch { /* private window */ } }

/**
 * On by default. Browsers refuse to play sound until the visitor does something, so it begins at the first
 * click, key press or tap. Turning it off is remembered, so it stays off on later visits.
 */
export default function SoundToggle({ mood, quiet }: { mood: Mood; quiet?: boolean }) {
  const [on, setOn] = useState(() => !muted())

  useEffect(() => {
    if (!on) return
    const go = () => { lofi.setMood(mood); lofi.start() }
    const ev = ['pointerdown', 'keydown', 'touchend'] as const
    ev.forEach((e) => window.addEventListener(e, go, { once: true }))
    return () => ev.forEach((e) => window.removeEventListener(e, go))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { lofi.setMood(mood) }, [mood])
  useEffect(() => { lofi.duck(!!quiet) }, [quiet, on])
  useEffect(() => {
    const vis = () => { if (document.hidden) lofi.stop(); else if (on && lofi.everStarted) lofi.start() }
    document.addEventListener('visibilitychange', vis)
    return () => document.removeEventListener('visibilitychange', vis)
  }, [on])

  const toggle = () => {
    const next = !on
    setOn(next)
    remember(!next)
    if (next) { lofi.setMood(mood); lofi.start() } else lofi.stop()
  }

  return (
    <button className="sound-toggle" onClick={toggle} aria-pressed={on} aria-label={on ? 'Turn the music off' : 'Turn the music on'} title={on ? 'Music on' : 'Music off'}>
      <span className="sound-bars" data-on={on} aria-hidden><i /><i /><i /><i /></span>
      <span className="mono">{on ? 'music on' : 'music off'}</span>
    </button>
  )
}
