import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

/** The paper on the shelf, read close up: a note that shows for a few seconds. Click it to put it away. */
export default function NoteCard() {
  const [text, setText] = useState<string | null>(null)
  const shown = useRef(false)
  useEffect(() => {
    let timer = 0
    // clicking the paper opens its note; clicking the paper again while a note is showing puts it away
    const on = (e: Event) => {
      const next = (e as CustomEvent<string>).detail
      clearTimeout(timer)
      if (shown.current) { shown.current = false; setText(null); return }
      shown.current = true
      setText(next)
      timer = window.setTimeout(() => { shown.current = false; setText(null) }, 9000)
    }
    window.addEventListener('note:toggle', on)
    return () => { window.removeEventListener('note:toggle', on); clearTimeout(timer) }
  }, [])
  return (
    <AnimatePresence>
      {text && (
        <motion.button
          key={text}
          className="note-card"
          onClick={() => { shown.current = false; setText(null) }}
          initial={{ opacity: 0, y: 30, rotate: 2 }}
          animate={{ opacity: 1, y: 0, rotate: -1.4 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          aria-label="A note. Click to put it away."
        >
          <span>{text}</span>
        </motion.button>
      )}
    </AnimatePresence>
  )
}
