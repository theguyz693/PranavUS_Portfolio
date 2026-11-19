import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useMotionValueEvent, useScroll, useTransform } from 'framer-motion'
import { projects, type Project } from './content'

// Projects without a clip get a slow colour field instead. Warm and teal hues; no purples.
const HUES: Record<string, [number, number]> = {
  cadence: [205, 175],
  collectorhub: [22, 48],
  'evacuation-planner': [352, 18],
  'light-reaction': [45, 12],
  lockout: [150, 190],
  'ride-sharing-dbms': [78, 112],
  'political-bias-detection': [218, 246],
  'multi-agent-research': [188, 160],
  novi: [38, 8],
  'payment-tracker': [165, 135],
  vibeflow: [335, 20],
}

function Card({ p, index, reduced }: { p: Project; index: number; reduced: boolean }) {
  const video = useRef<HTMLVideoElement>(null)
  const card = useRef<HTMLAnchorElement>(null)

  // tilt toward the pointer, a soft light follows it, and the picture inside drifts the other way
  const onMove = (e: React.PointerEvent) => {
    const el = card.current
    if (!el || reduced) return
    const r = el.getBoundingClientRect()
    const nx = (e.clientX - r.left) / r.width, ny = (e.clientY - r.top) / r.height
    el.style.setProperty('--mx', `${nx * 100}%`)
    el.style.setProperty('--my', `${ny * 100}%`)
    el.style.setProperty('--ry', `${(nx - 0.5) * 9}deg`)
    el.style.setProperty('--rx', `${(0.5 - ny) * 7}deg`)
    el.style.setProperty('--px', `${nx - 0.5}`)
    el.style.setProperty('--py', `${ny - 0.5}`)
  }
  const onLeave = () => {
    const el = card.current
    if (!el) return
    for (const k of ['--rx', '--ry', '--px', '--py']) el.style.setProperty(k, '0')
    el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg')
  }
  const clip = p.media.loop.find((u) => u.endsWith('.mp4')) ?? p.media.loop[0]
  const [a, b] = HUES[p.slug] ?? [200, 30]

  // play only while the card is on screen
  useEffect(() => {
    const v = video.current
    if (!v || reduced) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause() }, { threshold: 0.55 })
    io.observe(v)
    return () => io.disconnect()
  }, [reduced, clip])

  return (
    <Link ref={card} to={`/site/p/${p.slug}`} className="wcard" aria-label={`Open ${p.name}`} onPointerMove={onMove} onPointerLeave={onLeave}>
      <div
        className="wcard-bg"
        style={!clip ? { ['--a' as string]: `${a}`, ['--b' as string]: `${b}` } : undefined}
        data-field={!clip}
      >
        {clip && (reduced
          ? p.media.poster && <img src={p.media.poster} alt="" />
          : <video ref={video} src={clip} poster={p.media.poster ?? undefined} muted loop playsInline preload="metadata" aria-hidden />)}
      </div>
      <span className="wcard-no mono">{String(index + 1).padStart(2, '0')} / {String(projects.length).padStart(2, '0')}</span>
      <span className="wcard-status mono">{p.status}</span>
      <div className="wcard-body">
        <h3>{p.name}</h3>
        <p>{p.pitch}</p>
        <span className="wcard-open mono">open →</span>
      </div>
    </Link>
  )
}


const WorkRing = lazy(() => import('./WorkRing'))
const VH_PER = 70 // vh of scrolling per project



/** Letters alternate between upright sans and italic serif, like the reference's letter swaps. */
function Swap({ text }: { text: string }) {
  return <>{[...text].map((ch, k) => (ch === ' ' ? ' ' : <span key={k} className={k % 3 === 1 ? 'wk-it' : undefined}>{ch}</span>))}</>
}

/** Giant WORK wordmark; bent cards slide past as the page scrolls; the title of the centred card sits on top. */
export default function WorkGallery({ scroller, reduced }: { scroller: React.RefObject<HTMLDivElement | null>; reduced: boolean }) {
  const track = useRef<HTMLDivElement>(null)
  const nav = useNavigate()
  const [active, setActive] = useState(0)
  const n = projects.length
  const { scrollYProgress } = useScroll({ container: scroller, target: track, offset: ['start start', 'end end'] })
  const pos = useTransform(scrollYProgress, [0, 1], [0, n - 1])
  useMotionValueEvent(pos, 'change', (v) => setActive(Math.max(0, Math.min(n - 1, Math.round(v)))))
  // the wordmark is read first; as you scroll it lifts away and the cards rise into place
  const wordY = useTransform(scrollYProgress, [0, 0.08], ['0vh', '-7vh'])
  const stageY = useTransform(scrollYProgress, [0, 0.08], ['6vh', '9vh'])
  const metaO = useTransform(scrollYProgress, [0, 0.06], [0.2, 1])

  const jump = (dir: 1 | -1) => {
    const s = scroller.current, t = track.current
    if (!s || !t) return
    const per = (t.offsetHeight - innerHeight) / Math.max(1, n - 1)
    const next = Math.max(0, Math.min(n - 1, active + dir))
    s.scrollTo({ top: t.offsetTop + next * per, behavior: reduced ? 'auto' : 'smooth' })
  }

  if (reduced) {
    return (
      <section id="work" className="work2 work2-static" aria-labelledby="work-h">
        <h2 id="work-h">Work</h2>
        <div className="rail static">{projects.map((p, i) => <Card key={p.slug} p={p} index={i} reduced />)}</div>
      </section>
    )
  }
  const cur = projects[active]
  return (
    <section id="work" ref={track} className="wk" style={{ height: `calc(100vh + ${(n - 1) * VH_PER}vh)` }} aria-labelledby="work-h">
      <div className="wk-stick">
        <motion.h2 id="work-h" className="wk-word" style={{ y: wordY }} aria-label="Work">
          WORK
        </motion.h2>
        <motion.div className="wk-stage" style={{ y: stageY }}>
          <Suspense fallback={null}><WorkRing pos={pos} onOpen={(slug) => nav(`/site/p/${slug}`)} /></Suspense>
        </motion.div>
        <motion.div className="wk-meta" aria-live="polite" style={{ opacity: metaO }}>
          <h3 key={cur.slug} className="wk-title"><Swap text={cur.name.toUpperCase()} /></h3>
          <p className="wk-cat mono">{cur.stack.slice(0, 2).join(' · ')}</p>
        </motion.div>
        <div className="work2-ctl wk-ctl">
          <button onClick={() => jump(-1)} aria-label="Previous project">←</button>
          <button onClick={() => jump(1)} aria-label="Next project">→</button>
        </div>
      </div>
    </section>
  )
}
