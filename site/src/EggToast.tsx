import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { EggEvent } from './eggs'

/** A small box in the top right: "Easter egg found 3 / 7". Shows for a few seconds, then slips away. */
export default function EggToast() {
  const [egg, setEgg] = useState<EggEvent | null>(null)
  useEffect(() => {
    let timer = 0
    const on = (e: Event) => {
      setEgg((e as CustomEvent<EggEvent>).detail)
      clearTimeout(timer)
      timer = window.setTimeout(() => setEgg(null), 4600)
    }
    window.addEventListener('egg:found', on)
    return () => { window.removeEventListener('egg:found', on); clearTimeout(timer) }
  }, [])
  return (
    <AnimatePresence>
      {egg && (
        <motion.div
          key={egg.id}
          className="egg-toast"
          role="status"
          initial={{ opacity: 0, x: 40, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 40 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        >
          <span className="egg-label mono">{egg.count === egg.total ? 'all easter eggs found' : 'easter egg found'}</span>
          <b>{egg.name}</b>
          <span className="egg-count mono">{egg.count} / {egg.total}</span>
          <span className="egg-dots" aria-hidden>
            {Array.from({ length: egg.total }, (_, i) => <i key={i} data-on={i < egg.count} />)}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
