import { useEffect, useState } from 'react'
import { lofi, type Mood } from './lofi'


/** Always off on arrival. It only plays after the visitor presses the button, and never remembers that across visits. */
export default function SoundToggle({ mood, quiet }: { mood: Mood; quiet?: boolean }) {
  const [on, setOn] = useState(false)

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
    if (next) { lofi.setMood(mood); lofi.start() } else lofi.stop()
  }

  return (
    <button className="sound-toggle" onClick={toggle} aria-pressed={on} aria-label={on ? 'Turn the music off' : 'Turn the music on'} title={on ? 'Music on' : 'Music off'}>
      <span className="sound-bars" data-on={on} aria-hidden><i /><i /><i /><i /></span>
      <span className="mono">{on ? 'music on' : 'music off'}</span>
    </button>
  )
}
