import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { GithubIcon, GlobeIcon } from './icons'
import { SHOW_GAPS, projects, type Project } from './content'

/** The full-length demo: a poster with a play button, so the big file only loads when someone asks for it. */
function FullDemo({ src, poster, name }: { src: string; poster: string | null; name: string }) {
  const [on, setOn] = useState(false)
  if (on) return <video className="full-video" src={src} controls autoPlay playsInline aria-label={`${name} full demo`} />
  return (
    <button className="full-play" onClick={() => setOn(true)} style={poster ? { backgroundImage: `linear-gradient(rgba(10,11,13,.55), rgba(10,11,13,.55)), url(${poster})` } : undefined}>
      <span className="full-icon" aria-hidden>▶</span>
      <span className="full-label">Play the full demo</span>
    </button>
  )
}

/** One project laid out as its own small site. Used inside the window and on the 2D fallback page. */
export function ProjectSite({ p, basePath, reduced }: { p: Project; basePath: string; reduced: boolean }) {
  const rise = reduced ? {} : { initial: { opacity: 0, y: 48 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.2 }, transition: { duration: 0.8, ease: [0.2, 0.7, 0.2, 1] as const } }
  const idx = projects.findIndex((x) => x.slug === p.slug)
  const prev = projects[(idx - 1 + projects.length) % projects.length]
  const next = projects[(idx + 1) % projects.length]
  const { loop, poster, hero, full } = p.media

  return (
    <article className="ps">
      <header className="ps-hero">
        <p className="ps-status">{p.status}{p.role ? ` · ${p.role}` : ''}</p>
        <h1>{p.name}</h1>
        <p className="ps-lead">{p.pitch}</p>
        {(p.links.live || p.links.repo) && (
          <p className="ps-icons">
            {p.links.live && <a href={p.links.live} target="_blank" rel="noreferrer" aria-label={`${p.name} website`} title="Website"><GlobeIcon /><span>Website</span></a>}
            {p.links.repo && <a href={p.links.repo} target="_blank" rel="noreferrer" aria-label={`${p.name} code on GitHub`} title="Code"><GithubIcon /><span>Code</span></a>}
          </p>
        )}
      </header>

      {(loop.length > 0 || hero) && (
        <motion.div className="ps-media" {...(reduced ? {} : { initial: { opacity: 0, rotateX: 14, y: 60 }, whileInView: { opacity: 1, rotateX: 0, y: 0 }, viewport: { once: true, amount: 0.25 }, transition: { duration: 0.9, ease: [0.2, 0.7, 0.2, 1] } })} style={{ transformPerspective: 1100 }}>
          {loop.length > 0 ? (
            <video autoPlay={!reduced} muted loop playsInline controls={reduced} poster={poster ?? undefined} aria-label={`${p.name} demo recording`}>
              {loop.map((src) => <source key={src} src={src} type={src.endsWith('.webm') ? 'video/webm' : 'video/mp4'} />)}
            </video>
          ) : (
            <img src={hero!} alt={`${p.name} screenshot`} />
          )}
        </motion.div>
      )}

      <motion.section className="ps-sec" {...rise}>
        <h2>What it is</h2>
        <p className="ps-body">{p.description}</p>
      </motion.section>

      {full && (
        <motion.section className="ps-sec" {...rise}>
          <h2>Full demo</h2>
          <FullDemo src={full} poster={poster} name={p.name} />
        </motion.section>
      )}

      {p.hardestProblem && (
        <motion.section className="ps-sec" {...rise}>
          <h2>The hardest problem</h2>
          <p className="ps-statement">{p.hardestProblem}</p>
        </motion.section>
      )}

      {p.results.length > 0 && (
        <motion.section className="ps-sec" {...rise}>
          <h2>Results</h2>
          <ul className="ps-results">{p.results.map((r) => <li key={r}>{r}</li>)}</ul>
        </motion.section>
      )}

      <motion.section className="ps-sec" {...rise}>
        <h2>Built with</h2>
        <ul className="ps-stack">{p.stack.map((s) => <li key={s}>{s}</li>)}</ul>
      </motion.section>

      {SHOW_GAPS && p.todos.length > 0 && (
        <section className="ps-sec gap"><h2>Gaps (dev only)</h2><ul>{p.todos.map((t) => <li key={t}>{t}</li>)}</ul></section>
      )}

      <nav className="ps-next" aria-label="Other projects">
        <Link to={`${basePath}/${prev.slug}`}><span>Previous</span>{prev.name}</Link>
        <Link to={`${basePath}/${next.slug}`}><span>Next</span>{next.name}</Link>
      </nav>
    </article>
  )
}
