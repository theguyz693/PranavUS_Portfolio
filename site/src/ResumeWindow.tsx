import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { sfx } from './sfx'
import { motion, useReducedMotion } from 'framer-motion'
import { ReceiptPrinter, type ReceiptPrinterStage } from './ReceiptPrinter'
import ResumePaper from './ResumePaper'

/** The resume, printed out of a receipt printer. A plain download link sits next to it. */
export default function ResumeWindow({ reduced }: { reduced: boolean }) {
  const win = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const [stage, setStage] = useState<ReceiptPrinterStage>('processing')
  const [run, setRun] = useState(0)

  useEffect(() => { win.current?.focus() }, [])
  useEffect(() => { sfx.play('whoosh'); return () => sfx.play('back') }, [])
  // processing -> printing -> complete (no waiting when motion is reduced)
  useEffect(() => {
    if (reduce) { setStage('complete'); return }
    setStage('processing')
    const t1 = window.setTimeout(() => { setStage('printing'); sfx.play('print') }, 1100)
    const t2 = window.setTimeout(() => { setStage('complete'); sfx.play('ding') }, 1100 + 1900)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [run, reduce])

  return (
    <motion.div className="win-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.25 }}>
      <Link to="/site" className="win-dismiss" aria-label="Close resume" tabIndex={-1} />
      <motion.div
        ref={win} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Resume" className="win resume-win"
        initial={reduced ? { opacity: 0 } : { scale: 0.9, y: 24, opacity: 0 }}
        animate={reduced ? { opacity: 1 } : { scale: 1, y: 0, opacity: 1 }}
        exit={reduced ? { opacity: 0 } : { scale: 0.94, y: 16, opacity: 0 }}
        transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 26 }}
      >
        <div className="win-bar">
          <span>Resume</span>
          <span className="resume-actions">
            <button className="textlink linkbtn" onClick={() => setRun((n) => n + 1)}>Print again</button>
            <a href="/resume.pdf" download className="textlink">Download PDF</a>
            <Link to="/site" className="win-close">Close <kbd>esc</kbd></Link>
          </span>
        </div>
        <div className="win-scroll">
          <ReceiptPrinter.Root stage={stage} className="rp-wrap">
            <ReceiptPrinter.Machine>
              <ReceiptPrinter.Header>
                <ReceiptPrinter.Status />
              </ReceiptPrinter.Header>
              <ReceiptPrinter.Screen>
                <p className="rp-screen-line">{stage === 'complete' ? 'RESUME PRINTED' : 'PRINTING RESUME'}</p>
                <p className="rp-screen-sub">{stage === 'complete' ? 'ready to read' : stage === 'printing' ? 'feeding paper…' : 'warming up…'}</p>
              </ReceiptPrinter.Screen>
            </ReceiptPrinter.Machine>
            <ReceiptPrinter.Output>
              <ResumePaper />
            </ReceiptPrinter.Output>
          </ReceiptPrinter.Root>
        </div>
      </motion.div>
    </motion.div>
  )
}
