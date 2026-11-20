import { useEffect, useState } from 'react'
import { lofi, type Mood } from './lofi'
import { sfx } from './sfx'

const MUSIC_KEY = 'portfolio-music'
const SFX_KEY = 'portfolio-sfx'
const isOff = (k: string) => { try { return localStorage.getItem(k) === 'off' } catch { return false } }
const remember = (k: string, off: boolean) => { try { if (off) localStorage.setItem(k, 'off'); else localStorage.removeItem(k) } catch { /* private window */ } }

/**
 * Two switches: music, and interface sounds (clicks, scroll, the room). Each is on by default and each choice is
 * remembered. Browsers refuse sound until the visitor does something, so the music begins at the first click or key press.
 */
export default function SoundToggle({ mood, quiet }: { mood: Mood; quiet?: boolean }) {
  const [music, setMusic] = useState(() => !isOff(MUSIC_KEY))
  const [fx, setFx] = useState(() => !isOff(SFX_KEY))
  const [party, setParty] = useState(false) // disco mode is playing its own music

  // keep trying on every kind of first interaction until the browser really lets the music run
  useEffect(() => {
    if (!music) return
    const ev = ['pointerdown', 'pointerup', 'mousedown', 'click', 'keydown', 'touchend'] as const
    const off = () => ev.forEach((e) => window.removeEventListener(e, go, true))
    async function go() {
      if (isOff(MUSIC_KEY)) return off()
      lofi.setMood(mood)
      await lofi.start()
      if (lofi.running) off()
    }
    ev.forEach((e) => window.addEventListener(e, go, true))
    return off
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const h = (e: Event) => setParty(!!(e as CustomEvent<boolean>).detail)
    window.addEventListener('room:party', h)
    return () => window.removeEventListener('room:party', h)
  }, [])
  useEffect(() => { sfx.enabled = fx }, [fx])
  useEffect(() => { lofi.setMood(mood) }, [mood])
  useEffect(() => { lofi.duck(!!quiet) }, [quiet, music])
  useEffect(() => {
    const vis = () => { if (document.hidden) lofi.stop(); else if (music && lofi.everStarted) lofi.start() }
    document.addEventListener('visibilitychange', vis)
    return () => document.removeEventListener('visibilitychange', vis)
  }, [music])

  const toggleMusic = () => {
    const next = !music
    setMusic(next)
    remember(MUSIC_KEY, !next)
    if (next) { lofi.setMood(mood); lofi.start() } else lofi.stop()
  }
  const toggleFx = () => {
    const next = !fx
    setFx(next)
    remember(SFX_KEY, !next)
    sfx.enabled = true; sfx.play(next ? 'pop' : 'off'); sfx.enabled = next // the switch itself always answers
  }

  return (
    <div className="sound-dock">
      <button className="sound-toggle" onClick={toggleMusic} aria-pressed={music} aria-label={music ? 'Turn the music off' : 'Turn the music on'} title={music ? 'Music on' : 'Music off'}>
        <span className="sound-bars" data-on={music || party} aria-hidden><i /><i /><i /><i /></span>
        <span className="mono">{party ? 'party mode' : music ? 'music on' : 'music off'}</span>
      </button>
      <button className="sound-toggle" onClick={toggleFx} aria-pressed={fx} aria-label={fx ? 'Turn the interface sounds off' : 'Turn the interface sounds on'} title={fx ? 'Interface sounds on' : 'Interface sounds off'}>
        <span className="sound-dot" data-on={fx} aria-hidden />
        <span className="mono">{fx ? 'sounds on' : 'sounds off'}</span>
      </button>
    </div>
  )
}
