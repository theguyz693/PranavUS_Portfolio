import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform, type MotionProps } from 'framer-motion'
import Lenis from 'lenis'
import { profile } from './content'
import { GithubIcon, InstagramIcon, LinkedinIcon, MailIcon, PhoneIcon } from './icons'
import { randomFact } from './facts'
import ReactiveBg from './ReactiveBg'
import { sfx } from './sfx'
import WorkGallery from './WorkGallery'
import ResumeInline from './ResumeInline'

const SECTIONS = [
  { id: 'top', label: 'Intro' },
  { id: 'experience', label: 'Experience' },
  { id: 'work', label: 'Work' },
  { id: 'about', label: 'About' },
]

const slide = (reduced: boolean, from: 'left' | 'right' | 'up', i = 0): MotionProps =>
  reduced
    ? {}
    : {
        initial: { opacity: 0, x: from === 'left' ? -120 : from === 'right' ? 120 : 0, y: from === 'up' ? 40 : 0, filter: 'blur(10px)' },
        whileInView: { opacity: 1, x: 0, y: 0, filter: 'blur(0px)' },
        viewport: { once: true, margin: '-10%' },
        transition: { type: 'spring', stiffness: 110, damping: 20, delay: i * 0.09 },
      }

/** Text that rises from behind a mask when it scrolls into view. */
function Mask({ children, reduced }: { children: ReactNode; reduced: boolean }) {
  return (
    <span className="mask">
      <motion.span
        initial={reduced ? false : { y: '108%' }}
        whileInView={{ y: 0 }}
        viewport={{ once: true, margin: '-12%' }}
        transition={{ type: 'spring', stiffness: 80, damping: 18 }}
      >{children}</motion.span>
    </span>
  )
}

/** Big letters that rise into place one after another. */
function Word({ text, reduced, delay = 0, italics = [] }: { text: string; reduced: boolean; delay?: number; italics?: number[] }) {
  return (
    <span className="word" aria-hidden>
      {[...text].map((ch, i) => (
        <span className="ch" key={i}>
          <motion.span
            className={italics.includes(i) ? 'ital' : undefined}
            initial={reduced ? false : { y: '110%' }}
            animate={{ y: 0 }}
            transition={{ type: 'spring', stiffness: 90, damping: 16, delay: delay + i * 0.06 }}
          >{ch === ' ' ? ' ' : ch}</motion.span>
        </span>
      ))}
    </span>
  )
}

/** A section that grows from a small rounded panel to the full width as you scroll to it. */
function Frame({ scroller, reduced, id, className, labelledBy, children }: {
  scroller: React.RefObject<HTMLDivElement | null>; reduced: boolean; id: string; className: string; labelledBy: string; children: ReactNode
}) {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ container: scroller, target: ref, offset: ['start end', 'start 0.3'] })
  const clip = useTransform(scrollYProgress, [0, 1], ['inset(10vh 8vw 0vh round 40px)', 'inset(0vh 0vw 0vh round 0px)'])
  return (
    <motion.section ref={ref} id={id} className={className} aria-labelledby={labelledBy} style={reduced ? undefined : { clipPath: clip }}>
      {children}
    </motion.section>
  )
}

/** The portfolio as a website: what you get when you walk up to the monitor. */
export default function SiteView({ reduced, noRoom = false }: { reduced: boolean; noRoom?: boolean }) {
  const phoneHref = `tel:${profile.phone.replace(/\s+/g, '')}`
  const scroller = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLDivElement>(null)
  const lenisRef = useRef<Lenis | null>(null)
  const [active, setActive] = useState('top')
  const [fact, setFact] = useState(() => randomFact())
  const [copied, setCopied] = useState(false)
  const [printReq, setPrintReq] = useState(0)

  // On laptops there is often no mail or phone app: email opens Gmail's compose window, the phone icon copies the number.
  // Touch devices keep the normal mailto: and tel: links.
  const hasMouse = () => !matchMedia('(pointer: coarse)').matches
  const openGmail = (e: React.MouseEvent) => {
    if (!hasMouse()) return
    e.preventDefault()
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(profile.email)}`, '_blank', 'noopener')
  }
  const copyPhone = (e: React.MouseEvent) => {
    if (!hasMouse()) return
    e.preventDefault()
    navigator.clipboard?.writeText(profile.phone).then(() => { sfx.play('success'); setCopied(true); window.setTimeout(() => setCopied(false), 1800) }).catch(() => {})
  }

  // the hero is pinned for a while: the name rises and the details fade in line by line
  const simple = reduced || noRoom
  const { scrollYProgress: sp } = useScroll({ container: scroller, target: heroRef, offset: ['start start', 'end end'] })
  const nameY = useTransform(sp, [0, 0.8], ['0vh', '-22vh'])
  const nameScale = useTransform(sp, [0, 0.85], [1, 0.92])
  const nameFade = useTransform(sp, [0.1, 0.9], [1, 0.6])
  const tagO = useTransform(sp, [0.14, 0.3], [0, 1]), tagY = useTransform(sp, [0.14, 0.3], [30, 0])
  const cueO = useTransform(sp, [0, 0.1], [1, 0])
  const panelO = useTransform(sp, [0.3, 0.45], [0, 1])
  const o1 = useTransform(sp, [0.32, 0.46], [0, 1]), y1 = useTransform(sp, [0.32, 0.46], [36, 0])
  const o2 = useTransform(sp, [0.44, 0.58], [0, 1]), y2 = useTransform(sp, [0.44, 0.58], [36, 0])
  const o3 = useTransform(sp, [0.56, 0.72], [0, 1]), y3 = useTransform(sp, [0.56, 0.72], [36, 0])

  useEffect(() => {
    const root = scroller.current
    if (!root) return
    const io = new IntersectionObserver(
      (entries) => { for (const e of entries) if (e.isIntersecting) setActive(e.target.id) },
      { root, rootMargin: '-40% 0px -50% 0px' },
    )
    SECTIONS.forEach((s) => { const el = root.querySelector(`#${s.id}`); if (el) io.observe(el) })
    return () => io.disconnect()
  }, [])

  // smooth, slightly weighted scrolling (mouse wheels only; touch stays native)
  useEffect(() => {
    if (reduced || !scroller.current || !content.current) return
    const l = new Lenis({ wrapper: scroller.current, content: content.current, lerp: 0.085, smoothWheel: true })
    lenisRef.current = l
    let id = 0
    const raf = (t: number) => { l.raf(t); id = requestAnimationFrame(raf) }
    id = requestAnimationFrame(raf)
    return () => { cancelAnimationFrame(id); l.destroy(); lenisRef.current = null }
  }, [reduced])

  const go = (id: string) => {
    const el = scroller.current?.querySelector<HTMLElement>(`#${id}`)
    if (!el) return
    if (lenisRef.current) lenisRef.current.scrollTo(el, { duration: 1.3 })
    else el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' })
  }

  return (
    <motion.div
      ref={scroller}
      className="site"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduced ? 0 : 0.35, delay: reduced || noRoom ? 0 : 0.9 }}
    >
      <ReactiveBg host={scroller} reduced={reduced} />
      <div className="grain" aria-hidden />

      <div ref={content} className="site-content">
      <header className="site-bar">
        {noRoom ? <span className="site-mark">{profile.name}</span> : <Link to="/" className="site-mark">{profile.name}</Link>}
        <nav aria-label="Sections">
          <a href="#experience" onClick={(e) => { e.preventDefault(); go('experience') }}>Experience</a>
          <a href="#work" onClick={(e) => { e.preventDefault(); go('work') }}>Work</a>
          <a href="#about" onClick={(e) => { e.preventDefault(); go('about') }}>About</a>
          <a href="#resume" onClick={(e) => { e.preventDefault(); go('resume'); setPrintReq((n) => n + 1) }}>Resume</a>
          {!noRoom && <Link to="/" className="site-exit">Back to the room <kbd>esc</kbd></Link>}
        </nav>
      </header>

      <nav className="dots" aria-label="Page sections">
        {SECTIONS.map((s) => (
          <button key={s.id} className={active === s.id ? 'on' : ''} aria-label={s.label} aria-current={active === s.id} onClick={() => go(s.id)} />
        ))}
      </nav>

      <main>
        {/* 1. the name, big; the tagline starts beside it and the details pop in as you scroll */}
        <div id="top" ref={heroRef} className="hero4-track">
          <section className="hero4-stick" aria-label="Introduction">
            <motion.h1 className="h4-name" aria-label={profile.name} style={simple ? undefined : { y: nameY, scale: nameScale, opacity: nameFade }}>
              <Word text="PRANAV" reduced={reduced} delay={noRoom ? 0.1 : 0.9} italics={[2]} />
              <Word text="U S" reduced={reduced} delay={noRoom ? 0.55 : 1.35} />
            </motion.h1>
            <aside className="h4-side">
              <motion.p className="h4-tag" style={simple ? undefined : { opacity: tagO, y: tagY }}>{profile.copy.tagline}</motion.p>
              <motion.div className="h4-panel" style={simple ? undefined : { opacity: panelO }}>
                <motion.p className="h4-line" style={simple ? undefined : { opacity: o1, y: y1 }}>{profile.badge}</motion.p>
                <motion.p className="h4-line" style={simple ? undefined : { opacity: o2, y: y2 }}>{profile.location}</motion.p>
                <motion.div className="h4-did" style={simple ? undefined : { opacity: o3, y: y3 }}>
                  <span>Did you know?</span>
                  <p>{fact} <button onClick={() => setFact((f) => randomFact(f))} aria-label="Show another fact">↻</button></p>
                </motion.div>
              </motion.div>
            </aside>
            <div className="hero-sweep" aria-hidden />
            {!simple && (
              <motion.div className="h4-cue" aria-hidden style={{ opacity: cueO }}>
                <i /><span>scroll</span>
              </motion.div>
            )}
          </section>
        </div>

        {/* 2. experience */}
        <Frame scroller={scroller} reduced={reduced} id="experience" className="exp2" labelledBy="exp-h">
          <h2 id="exp-h"><Mask reduced={reduced}>Experience</Mask></h2>
          {profile.experience.map((x) => (
            <article key={x.org + x.from} className="exp2-item">
              <motion.div className="exp2-meta" {...slide(reduced, 'left', 1)}>
                <p className="exp2-when">{x.from}<br />– {x.to}</p>
                <p className="exp2-where mono">{x.org} · {x.place}</p>
              </motion.div>
              <motion.div className="exp2-body" {...slide(reduced, 'right', 2)}>
                <h3>{x.role}</h3>
                <ul>{x.points.map((pt, i) => <motion.li key={pt} {...slide(reduced, 'right', 3 + i)}>{pt}</motion.li>)}</ul>
              </motion.div>
            </article>
          ))}
        </Frame>

        {/* 3. work: clips and colour fields, sideways */}
        <WorkGallery scroller={scroller} reduced={reduced} />

        {/* 4. about, skills, links, resume */}
        <Frame scroller={scroller} reduced={reduced} id="about" className="about2" labelledBy="about-h">
          <div className="about2-grid">
            <div>
              <h2 id="about-h"><Mask reduced={reduced}>About</Mask></h2>
              <motion.p className="about2-text" {...slide(reduced, 'left', 1)}>{profile.copy.about}</motion.p>
              <dl className="skills2">
                {Object.entries(profile.skills).map(([group, items], i) => (
                  <motion.div key={group} {...slide(reduced, i % 2 ? 'right' : 'left', 2 + i)}>
                    <dt>{group}</dt><dd>{(items as string[]).join(' · ')}</dd>
                  </motion.div>
                ))}
              </dl>
            </div>
            <div className="about2-links">
              <motion.h3 {...slide(reduced, 'right')}>Find me</motion.h3>
              <ul className="icon-links">
                {[
                  { label: 'GitHub', href: profile.links.github, icon: <GithubIcon />, ext: true },
                  profile.linkedin && { label: 'LinkedIn', href: profile.linkedin, icon: <LinkedinIcon />, ext: true },
                  profile.instagram && { label: 'Instagram', href: profile.instagram, icon: <InstagramIcon />, ext: true },
                  { label: 'Email ' + profile.email, href: `mailto:${profile.email}`, icon: <MailIcon />, onClick: openGmail },
                  { label: 'Copy phone number ' + profile.phone, href: phoneHref, icon: <PhoneIcon />, onClick: copyPhone, tip: true },
                ].filter(Boolean).map((l, i) => {
                  const x = l as { label: string; href: string; icon: ReactNode; ext?: boolean; onClick?: (e: React.MouseEvent) => void; tip?: boolean }
                  return (
                    <motion.li key={x.label} {...slide(reduced, 'right', 1 + i)}>
                      <a href={x.href} target={x.ext ? '_blank' : undefined} rel="noreferrer" aria-label={x.label} title={x.label} onClick={x.onClick}>{x.icon}</a>
                      {x.tip && copied && <span className="copied-tip" role="status">Copied</span>}
                    </motion.li>
                  )
                })}
              </ul>
              <motion.p className="mono dim" {...slide(reduced, 'right', 6)}>{profile.email}<br />{profile.phone}<br />{profile.location}</motion.p>
            </div>
          </div>
          <ResumeInline request={printReq} onRequest={() => setPrintReq((n) => n + 1)} />
        </Frame>
      </main>

      <footer className="site-foot">PRANAV U S<span className="site-credit">3D: Dark Wood Book Shelf by Jeff Kratzer (G1ngerBoy) · Philips Radio by Lassi Kaukonen</span></footer>
      </div>
    </motion.div>
  )
}
