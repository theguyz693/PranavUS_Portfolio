import { createContext, useContext, type ComponentPropsWithoutRef, type CSSProperties, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

/**
 * Receipt printer, ported from the owner's Tailwind component to plain CSS (see .rp-* in site.css).
 * Same parts and behaviour: processing -> printing (paper feeds one line at a time) -> complete.
 */
export type ReceiptPrinterStage = 'processing' | 'printing' | 'complete'
export type ReceiptFeedMotion = 'smooth' | 'stepped'

type Ctx = { animate: boolean; feedMotion: ReceiptFeedMotion; shouldMove: boolean; stage: ReceiptPrinterStage }
const ReceiptPrinterContext = createContext<Ctx | null>(null)

const easeOut = [0.23, 1, 0.32, 1] as const
const easeInOut = [0.77, 0, 0.175, 1] as const

// torn-paper bottom edge
const TOOTH_COUNT = 40
const TOOTH_DEPTH = 4
const toothPoints = Array.from({ length: TOOTH_COUNT * 2 }, (_, i) => {
  const x = 100 - ((i + 1) * 100) / (TOOTH_COUNT * 2)
  const y = i % 2 === 0 ? '100%' : `calc(100% - ${TOOTH_DEPTH}px)`
  return `${x}% ${y}`
}).join(', ')
const receiptClipPath = `polygon(0 0, 100% 0, 100% calc(100% - ${TOOTH_DEPTH}px), ${toothPoints})`

const printingTransformKeyframes = [
  'translateY(calc(-100% + 2px))', 'translateY(-91%)', 'translateY(-91%)', 'translateY(-81%)', 'translateY(-81%)',
  'translateY(-70%)', 'translateY(-70%)', 'translateY(-58%)', 'translateY(-58%)', 'translateY(-45%)',
  'translateY(-45%)', 'translateY(-32%)', 'translateY(-32%)', 'translateY(-20%)', 'translateY(-20%)',
  'translateY(-10%)', 'translateY(-10%)', 'translateY(-3%)', 'translateY(-3%)', 'translateY(0%)',
]
const printingKeyframeTimes = [0, 0.075, 0.105, 0.18, 0.21, 0.285, 0.315, 0.39, 0.42, 0.495, 0.525, 0.6, 0.63, 0.705, 0.735, 0.81, 0.84, 0.915, 0.945, 1]

const statusLabels: Record<ReceiptPrinterStage, ReactNode> = {
  processing: 'Processing your order',
  printing: 'Printing your receipt',
  complete: 'Order complete',
}

function useReceiptPrinter(component: string) {
  const ctx = useContext(ReceiptPrinterContext)
  if (!ctx) throw new Error(`${component} must be used inside ReceiptPrinter.Root.`)
  return ctx
}

function Root({ animate = true, children, className = '', feedMotion = 'stepped', stage, ...props }:
  Omit<ComponentPropsWithoutRef<'section'>, 'children'> & { animate?: boolean; children: ReactNode; feedMotion?: ReceiptFeedMotion; stage: ReceiptPrinterStage }) {
  const reduce = useReducedMotion()
  const value: Ctx = { animate, feedMotion, shouldMove: animate && !reduce, stage }
  return (
    <ReceiptPrinterContext.Provider value={value}>
      <section aria-label="Receipt printer" className={`rp-root ${className}`} data-stage={stage} {...props}>{children}</section>
    </ReceiptPrinterContext.Provider>
  )
}

function Machine({ children, className = '', ...props }: ComponentPropsWithoutRef<'div'>) {
  return (
    <div className={`rp-machine ${className}`} {...props}>
      {children}
      <div aria-hidden className="rp-slot" />
    </div>
  )
}

const Header = ({ children, className = '', ...props }: ComponentPropsWithoutRef<'div'>) => <div className={`rp-header ${className}`} {...props}>{children}</div>
const Screen = ({ children, className = '', ...props }: ComponentPropsWithoutRef<'div'>) => (
  <div className={`rp-screen ${className}`} {...props}><div className="rp-screen-in">{children}</div></div>
)

function StatusIndicator({ animate, move, stage }: { animate: boolean; move: boolean; stage: ReceiptPrinterStage }) {
  const done = stage === 'complete'
  return (
    <span aria-hidden className="rp-ind">
      <AnimatePresence initial={false} mode="sync">
        {done ? (
          <motion.span key="done" className="rp-ind-i rp-ok"
            initial={{ opacity: animate ? 0 : 1, transform: move ? 'scale(0.94)' : 'scale(1)' }} animate={{ opacity: 1, transform: 'scale(1)' }}
            exit={{ opacity: animate ? 0 : 1, transform: move ? 'scale(0.96)' : 'scale(1)' }} transition={{ duration: animate ? 0.16 : 0, ease: easeOut }}>
            <svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor"><path d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24Zm45.66 85.66-56 56a8 8 0 0 1-11.32 0l-24-24a8 8 0 0 1 11.32-11.32L112 148.69l50.34-50.35a8 8 0 0 1 11.32 11.32Z" /></svg>
          </motion.span>
        ) : (
          <motion.span key="work" className="rp-ind-i"
            initial={{ opacity: animate ? 0 : 1, transform: move ? 'scale(0.94)' : 'scale(1)' }} animate={{ opacity: 1, transform: 'scale(1)' }}
            exit={{ opacity: animate ? 0 : 1, transform: move ? 'scale(0.96)' : 'scale(1)' }} transition={{ duration: animate ? 0.16 : 0, ease: easeOut }}>
            <svg className={animate ? 'rp-spin' : undefined} width="18" height="18" viewBox="0 0 256 256" fill="currentColor"><path d="M232 128a104 104 0 0 1-208 0c0-41 23.81-78.36 60.66-95.2a8 8 0 0 1 6.68 14.56C63.79 62.28 40 93.7 40 128a88 88 0 0 0 176 0c0-34.3-23.79-65.72-51.34-80.64a8 8 0 0 1 6.68-14.56C208.19 49.64 232 87 232 128Z" /></svg>
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}

function Status({ children, className = '' }: { children?: ReactNode; className?: string }) {
  const { animate, shouldMove, stage } = useReceiptPrinter('ReceiptPrinter.Status')
  return (
    <div className={`rp-status ${className}`}>
      <StatusIndicator animate={animate} move={shouldMove} stage={stage} />
      <div aria-live="polite" role="status" className="rp-status-text">
        <AnimatePresence initial={false} mode="sync">
          <motion.div key={stage}
            initial={{ opacity: animate ? 0 : 1, transform: shouldMove ? 'translateY(4px)' : 'translateY(0px)' }} animate={{ opacity: 1, transform: 'translateY(0px)' }}
            exit={{ opacity: animate ? 0 : 1, transform: shouldMove ? 'translateY(-4px)' : 'translateY(0px)' }} transition={{ duration: animate ? 0.18 : 0, ease: easeOut }}>
            {children ?? statusLabels[stage]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

function Paper({ children, className = '', style, ...props }: ComponentPropsWithoutRef<'article'>) {
  return <article className={`rp-paper ${className}`} style={{ clipPath: receiptClipPath, ...(style as CSSProperties) }} {...props}>{children}</article>
}

function Output({ children, className = '', ...props }: ComponentPropsWithoutRef<'div'>) {
  const { feedMotion, shouldMove, stage } = useReceiptPrinter('ReceiptPrinter.Output')
  const visible = stage !== 'processing'
  const stepped = feedMotion === 'stepped' && stage === 'printing' && shouldMove
  return (
    <div className={`rp-output ${className}`} {...props}>
      {visible ? <div aria-hidden className="rp-shade" /> : null}
      <motion.div
        className="rp-feed"
        data-visible={visible}
        initial={false}
        aria-hidden={stage !== 'complete'}
        animate={{
          transform: stage === 'printing' && shouldMove
            ? (stepped ? printingTransformKeyframes : 'translateY(0%)')
            : visible || !shouldMove ? 'translateY(0%)' : 'translateY(calc(-100% + 2px))',
        }}
        transition={{
          transform: { duration: shouldMove ? 1.75 : 0, ease: stepped ? 'linear' : easeInOut, times: stepped ? printingKeyframeTimes : undefined },
        }}
      >
        {children}
      </motion.div>
    </div>
  )
}

export const ReceiptPrinter = { Header, Machine, Output, Paper, Root, Screen, Status }
