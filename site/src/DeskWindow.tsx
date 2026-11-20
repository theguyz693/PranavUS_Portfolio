import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { sfx } from './sfx'
import { motion } from 'framer-motion'
import { projects, profile } from './content'
import { fx } from './fxState'
import resumeData from './data/resume.json'
import SnakeGame from './SnakeGame'
import { GithubIcon, LinkedinIcon, MailIcon, PhoneIcon } from './icons'

export type DeskApp = 'projects' | 'about' | 'resume' | 'contact' | 'games'
export const isDeskApp = (v?: string): v is DeskApp => v === 'projects' || v === 'about' || v === 'resume' || v === 'contact' || v === 'games'

const TITLES: Record<DeskApp, string> = { projects: 'Projects', about: 'About', resume: 'Resume', contact: 'Contact', games: 'Games' }
const links = profile.links as Record<string, string | null | undefined>
const linkedin = profile.linkedin ?? links.linkedin ?? null

const hasMouse = () => !matchMedia('(pointer: coarse)').matches
function composeUrl(subject: string, body: string) {
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(profile.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
function mailtoUrl(subject: string, body: string) {
  return `mailto:${profile.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

function Contact() {
  const [copied, setCopied] = useState(false)
  const reasons = [
    { label: 'Work together', sub: 'an internship, a project or a role', subject: 'Working together', body: "Hi Pranav,\n\nI'd like to talk about working together.\n\n" },
    { label: 'Build me a site like this', sub: 'a 3D or interactive portfolio of your own', subject: 'A site like your portfolio', body: "Hi Pranav,\n\nI saw your portfolio and I'd like something like it.\n\n" },
    { label: 'Just say hi', sub: 'questions, feedback, anything', subject: 'Hello from your portfolio', body: 'Hi Pranav,\n\n' },
  ]
  const open = (e: React.MouseEvent, r: (typeof reasons)[number]) => {
    if (!hasMouse()) return // phones use the normal mail link
    e.preventDefault()
    window.open(composeUrl(r.subject, r.body), '_blank', 'noopener')
  }
  const copyPhone = () => navigator.clipboard?.writeText(profile.phone).then(() => { sfx.play('success'); setCopied(true); window.setTimeout(() => setCopied(false), 1800) }).catch(() => {})
  return (
    <article className="ps">
      <header className="ps-hero">
        <p className="ps-status">{profile.location}</p>
        <h1>Contact</h1>
        <p className="ps-lead">The quickest way to reach me is email. Pick what it is about and a message is started for you.</p>
      </header>
      <section className="ps-sec">
        <h2>Write to me</h2>
        <div className="desk-reasons">
          {reasons.map((r) => (
            <a key={r.label} className="desk-reason" href={mailtoUrl(r.subject, r.body)} onClick={(e) => open(e, r)}>
              <b>{r.label}</b><span>{r.sub}</span><i aria-hidden>→</i>
            </a>
          ))}
        </div>
      </section>
      <section className="ps-sec">
        <h2>Details</h2>
        <ul className="desk-details">
          <li><MailIcon /><a href={`mailto:${profile.email}`}>{profile.email}</a></li>
          <li><PhoneIcon /><button className="linkbtn" onClick={copyPhone}>{profile.phone}</button><span className="mono">{copied ? 'copied' : 'click to copy'}</span></li>
          {linkedin && <li><LinkedinIcon /><a href={linkedin} target="_blank" rel="noreferrer">LinkedIn</a></li>}
          {links.github && <li><GithubIcon /><a href={links.github} target="_blank" rel="noreferrer">GitHub</a></li>}
        </ul>
      </section>
    </article>
  )
}

function About() {
  return (
    <article className="ps">
      <header className="ps-hero">
        <p className="ps-status">{profile.badge}</p>
        <h1>About</h1>
        <p className="ps-lead">{profile.copy.about}</p>
      </header>
      <section className="ps-sec">
        <h2>What I use</h2>
        <dl className="skills2 desk-skills">
          {Object.entries(profile.skills).map(([group, items]) => (
            <div key={group}><dt>{group}</dt><dd>{(items as string[]).join(', ')}</dd></div>
          ))}
        </dl>
      </section>
      <section className="ps-sec">
        <h2>Experience</h2>
        {profile.experience.map((x) => (
          <div key={x.org} className="desk-exp">
            <p><b>{x.role}</b>, {x.org} <span className="mono">{x.from} – {x.to}</span></p>
            <ul className="ps-results">{x.points.map((pt) => <li key={pt}>{pt}</li>)}</ul>
          </div>
        ))}
      </section>
    </article>
  )
}

function Resume() {
  const r = resumeData
  return (
    <article className="ps">
      <header className="ps-hero">
        <p className="ps-status">{r.location}</p>
        <h1>Resume</h1>
        <p className="ps-icons"><a href="/resume.pdf" download><span>Download PDF</span></a></p>
      </header>
      <section className="ps-sec">
        <h2>Education</h2>
        <p className="ps-body"><b>{r.education?.school}</b><br />{r.education?.degree}<br />Expected {r.education?.expected} · CGPA {r.education?.cgpa}</p>
      </section>
      <section className="ps-sec">
        <h2>Experience</h2>
        {r.experience.map((x) => (
          <div key={x.org} className="desk-exp">
            <p><b>{x.role}</b>, {x.org} ({x.place}) <span className="mono">{x.from} – {x.to}</span></p>
            <ul className="ps-results">{x.points.map((pt) => <li key={pt}>{pt}</li>)}</ul>
          </div>
        ))}
      </section>
      <section className="ps-sec">
        <h2>Projects</h2>
        {r.projects.map((p) => (
          <div key={p.name} className="desk-exp">
            <p><b>{p.name}</b></p>
            <p className="mono">{p.stack}</p>
            <p className="ps-body">{p.text}</p>
          </div>
        ))}
        {r.additional && <p className="ps-body"><b>Also:</b> {r.additional}</p>}
      </section>
      <section className="ps-sec">
        <h2>Skills</h2>
        <dl className="skills2 desk-skills">
          {Object.entries(r.skills).map(([g, items]) => (
            <div key={g}><dt>{g}</dt><dd>{(items as string[]).join(', ')}</dd></div>
          ))}
        </dl>
      </section>
    </article>
  )
}

function Row({ slug, name, pitch, status, clip, poster }: { slug: string; name: string; pitch: string; status: string; clip?: string; poster?: string | null }) {
  const v = useRef<HTMLVideoElement>(null)
  return (
    <Link to={`/p/${slug}`} className="desk-row" onPointerEnter={() => v.current?.play().catch(() => {})} onPointerLeave={() => { v.current?.pause() }}>
      <span className="desk-thumb">
        {clip ? <video ref={v} src={clip} poster={poster ?? undefined} muted loop playsInline preload="metadata" aria-hidden /> : poster ? <img src={poster} alt="" /> : <i />}
      </span>
      <span className="desk-meta"><b>{name}</b><span>{pitch}</span><em className="mono">{status}</em></span>
      <span className="desk-go" aria-hidden>→</span>
    </Link>
  )
}

function Projects() {
  return (
    <article className="ps">
      <header className="ps-hero">
        <p className="ps-status">{projects.length} projects</p>
        <h1>Projects</h1>
        <p className="ps-lead">Hover one to preview it. Click to open it.</p>
      </header>
      <section className="ps-sec desk-list">
        {projects.map((p) => (
          <Row key={p.slug} slug={p.slug} name={p.name} pitch={p.pitch} status={p.status}
            clip={p.media.loop.find((u) => u.endsWith('.mp4')) ?? p.media.loop[0]} poster={p.media.poster ?? p.media.hero} />
        ))}
      </section>
    </article>
  )
}

/** One of the monitor's icons, opened as a small site in a window, like the project windows. */
function DeskPage({ app, reduced }: { app: DeskApp; reduced: boolean }) {
  const win = useRef<HTMLDivElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  useEffect(() => { win.current?.focus() }, [])
  useEffect(() => { sfx.play('whoosh'); return () => sfx.play('back') }, [])
  useEffect(() => { scroller.current?.scrollTo({ top: 0 }) }, [app])
  // the camera goes to the monitor first
  const delay = reduced ? 0 : 0.7
  return (
    <motion.div className="win-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.25, delay }}>
      <Link to="/desk" className="win-dismiss" aria-label={`Close ${TITLES[app]}`} tabIndex={-1} />
      <motion.div
        ref={win} tabIndex={-1} role="dialog" aria-modal="true" aria-label={TITLES[app]} className="win"
        initial={reduced ? { opacity: 0 } : { scale: 0.86, y: 24, opacity: 0 }}
        animate={reduced ? { opacity: 1 } : { scale: 1, y: 0, opacity: 1 }}
        exit={reduced ? { opacity: 0 } : { scale: 0.92, y: 16, opacity: 0 }}
        transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 26, delay }}
      >
        <div className="win-bar">
          <span>{TITLES[app]}</span>
          <span className="resume-actions">
            {(['projects', 'about', 'resume', 'contact', 'games'] as const).filter((a) => a !== app).map((a) => <Link key={a} to={`/d/${a}`} className="textlink">{TITLES[a]}</Link>)}
            <Link to="/desk" className="win-close">Close <kbd>esc</kbd></Link>
          </span>
        </div>
        <div className="win-scroll" ref={scroller}>
          {app === 'contact' ? <Contact /> : app === 'about' ? <About /> : app === 'resume' ? <Resume /> : <Projects />}
        </div>
      </motion.div>
    </motion.div>
  )
}

/** Snake as a small pop-up window on the monitor, in the empty area beside the portfolio window. */
function SnakePopup({ reduced }: { reduced: boolean }) {
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => { sfx.play('pop'); return () => sfx.play('back') }, [])
  // follow the monitor's glass as the camera settles: the pop-up fills the empty area to the right of the portfolio window
  useEffect(() => {
    let id = 0
    const tick = () => {
      const el = box.current, r = fx.screen
      if (el && r) {
        const room = r.h * 0.76
        const width = Math.max(240, Math.min(r.w * 0.4, room - 120))
        el.style.width = `${width}px`
        el.style.left = `${r.x + r.w * 0.965 - width}px`
        el.style.top = `${r.y + r.h * 0.16}px`
        el.style.right = 'auto'
      }
      id = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(id)
  }, [])
  return (
    <motion.div
      ref={box}
      className="desk-pop" role="dialog" aria-label="Snake"
      initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 14 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 10 }}
      transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 26, delay: 0.5 }}
    >
      <div className="desk-pop-bar">
        <span className="desk-pop-dots" aria-hidden><i /><i /><i /></span>
        <span className="mono">snake</span>
        <Link to="/desk" className="desk-pop-x" aria-label="Close Snake">×</Link>
      </div>
      <SnakeGame compact />
    </motion.div>
  )
}

export default function DeskWindow({ app, reduced }: { app: DeskApp; reduced: boolean }) {
  return app === 'games' ? <SnakePopup reduced={reduced} /> : <DeskPage app={app} reduced={reduced} />
}
