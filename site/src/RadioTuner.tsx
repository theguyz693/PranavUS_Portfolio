import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { DIAL_MAX, DIAL_MIN, freqAt, radio, useRadio } from './radio'
import { sfx } from './sfx'

const TICKS = Array.from({ length: (DIAL_MAX - DIAL_MIN) / 2 + 1 }, (_, i) => DIAL_MIN + i * 2)

/** The radio's tuning dial: drag it, or use the arrow keys. Between stations there is static; near one it locks in. */
export default function RadioTuner() {
  const r = useRadio()
  const dial = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const lockedName = r.locked?.name

  useEffect(() => { if (r.on) panel.current?.focus() }, [r.on])
  useEffect(() => { if (lockedName) sfx.play('tick') }, [lockedName])

  const setFromEvent = (clientX: number) => {
    const el = dial.current
    if (!el) return
    const b = el.getBoundingClientRect()
    radio.tune((clientX - b.left) / b.width)
  }
  const onDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    setFromEvent(e.clientX)
  }
  const onMove = (e: React.PointerEvent) => { if (e.buttons) setFromEvent(e.clientX) }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); radio.tune(r.pos - (e.shiftKey ? 0.04 : 0.008)) }
    else if (e.key === 'ArrowRight') { e.preventDefault(); radio.tune(r.pos + (e.shiftKey ? 0.04 : 0.008)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); radio.next(1) }
    else if (e.key === 'ArrowDown') { e.preventDefault(); radio.next(-1) }
  }

  const label = r.status === 'loading' ? 'finding stations…'
    : r.status === 'error' ? 'could not reach any stations'
    : r.locked ? r.locked.name
    : 'tuning…'

  return (
    <AnimatePresence>
      {r.on && (
        <motion.div
          ref={panel} tabIndex={0} onKeyDown={onKey}
          className="radio-tuner" role="group" aria-label="Radio tuner"
          initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
          transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        >
          <div className="radio-top">
            <span className="mono">radio · dial {freqAt(r.pos).toFixed(1)}</span>
            <button className="radio-off" onClick={() => radio.power(false)} aria-label="Turn the radio off">off</button>
          </div>
          <p className="radio-name" data-lock={!!r.locked} aria-live="polite">{label}{r.locked && r.buffering ? ' …' : ''}</p>
          <div className="radio-dial" ref={dial} onPointerDown={onDown} onPointerMove={onMove}>
            <div className="radio-ticks" aria-hidden>
              {TICKS.map((t) => <span key={t} style={{ left: `${((t - DIAL_MIN) / (DIAL_MAX - DIAL_MIN)) * 100}%` }}>{t}</span>)}
            </div>
            {r.stations.map((s) => <i key={s.url} className="radio-dot" data-on={s === r.locked} style={{ left: `${s.pos * 100}%` }} />)}
            <b className="radio-needle" style={{ left: `${r.pos * 100}%` }} />
          </div>
          <div className="radio-btns">
            <button onClick={() => radio.next(-1)} aria-label="Previous station">◀ prev</button>
            <span className="mono">drag the dial, or use ← →</span>
            <button onClick={() => radio.next(1)} aria-label="Next station">next ▶</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
