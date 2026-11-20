import { useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { sfx } from './sfx'
import { ReceiptPrinter, type ReceiptPrinterStage } from './ReceiptPrinter'
import ResumePaper from './ResumePaper'

/**
 * The resume, printed right here on the page, under About.
 * `request` goes up by one each time something (the button, the top-bar link) asks for it to print.
 */
export default function ResumeInline({ request, onRequest }: { request: number; onRequest: () => void }) {
  const reduce = useReducedMotion()
  const [started, setStarted] = useState(false)
  const [stage, setStage] = useState<ReceiptPrinterStage>('processing')

  useEffect(() => {
    if (request === 0) return
    setStarted(true)
    if (reduce) { setStage('complete'); return }
    setStage('processing')
    const t1 = window.setTimeout(() => { setStage('printing'); sfx.play('print') }, 1100)
    const t2 = window.setTimeout(() => { setStage('complete'); sfx.play('ding') }, 3000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [request, reduce])

  return (
    <div id="resume" className="resume-block">
      <h3>Resume</h3>
      <p className="resume-sub">Printed fresh, one line at a time.</p>
      <div className="resume-btns">
        <button className="cta" onClick={onRequest}>{started ? 'Print again' : 'View my resume'}</button>
        <a className="textlink" href="/resume.pdf" download>Download PDF</a>
      </div>

      {started && (
        <ReceiptPrinter.Root stage={stage} className="rp-wrap rp-inline">
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
      )}
    </div>
  )
}
