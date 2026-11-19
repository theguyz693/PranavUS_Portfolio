import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Link, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { bySlug, profile, projects } from './content'
import ProjectWindow from './ProjectWindow'
import SiteView from './SiteView'
import ResumeWindow from './ResumeWindow'
import CustomCursor from './CustomCursor'

const Room = lazy(() => import('./Room'))

function webglOk() {
  try { return !!document.createElement('canvas').getContext('webgl2') } catch { return false }
}

function useRoomMode() {
  const [mode, setMode] = useState<{ ok: boolean; reduced: boolean } | null>(null)
  useEffect(() => {
    const wideQ = matchMedia('(min-width: 768px)')
    const redQ = matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setMode({ ok: wideQ.matches && webglOk(), reduced: redQ.matches })
    update()
    wideQ.addEventListener('change', update)
    redQ.addEventListener('change', update)
    return () => { wideQ.removeEventListener('change', update); redQ.removeEventListener('change', update) }
  }, [])
  return mode
}

/** Home (room), project window over the room, website over the room, project window over the website. */
function Landing() {
  const { slug } = useParams()
  const { pathname } = useLocation()
  const nav = useNavigate()
  const mode = useRoomMode()
  const fallback = !!mode && !mode.ok // phones and weak GPUs: the website without the 3D room
  const site = pathname.startsWith('/site') || fallback
  const resume = pathname === '/site/resume'
  const valid = bySlug(slug)?.slug
  const [settled, setSettled] = useState(false)

  useEffect(() => {
    setSettled(false)
    if (!site) return
    const t = setTimeout(() => setSettled(true), mode?.reduced ? 0 : 1200)
    return () => clearTimeout(t)
  }, [site, mode?.reduced])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (resume) nav('/site')
      else if (valid) nav(site ? '/site' : '/')
      else if (site) nav('/')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [valid, site, resume, nav])

  if (fallback) {
    const red = !!mode?.reduced
    return (
      <div className="stage">
        <SiteView reduced={red} noRoom />
        <CustomCursor />
        <AnimatePresence>{resume && <ResumeWindow key="resume" reduced={red} />}</AnimatePresence>
        <AnimatePresence>{valid && <ProjectWindow key="win" slug={valid} base="site" reduced={red} />}</AnimatePresence>
      </div>
    )
  }

  const view = site ? 'monitor' : valid ? 'shelf' : 'home'
  const reduced = !!mode?.reduced
  return (
    <div className="stage">
      {mode && (
        <Suspense fallback={null}>
          <Room reducedMotion={reduced} activeSlug={site ? undefined : valid} view={view} paused={(site && settled) || valid === 'vibeflow'} />
        </Suspense>
      )}
      <AnimatePresence>
        {!site && !valid && (
          <motion.div key="hero" className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <span className="mono">portfolio / {new Date().getFullYear()}</span>
            <h1 className="overlay-name">{profile.name}</h1>
            <Link className="mono" to="/site">Open the website →</Link>
            <Link className="mono" to="/index">Browse as list →</Link>
            <button className="mono linkbtn" onClick={() => window.dispatchEvent(new Event('room:reset'))}>Reset camera ⟲</button>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {site && mode && <SiteView key="site" reduced={reduced} />}
      </AnimatePresence>
      {site && mode && <CustomCursor />}
      <AnimatePresence>
        {resume && mode && <ResumeWindow key="resume" reduced={reduced} />}
      </AnimatePresence>
      <AnimatePresence>
        {valid && mode && <ProjectWindow key="win" slug={valid} base={site ? 'site' : 'room'} reduced={reduced} />}
      </AnimatePresence>
      {!site && !valid && (
        <nav className="sr-list" aria-label="Projects">
          <Link to="/site">Open the website</Link>
          {projects.map((p) => <Link key={p.slug} to={`/p/${p.slug}`}>{p.name}</Link>)}
        </nav>
      )}
    </div>
  )
}

function ListPage() {
  return (
    <div className="wrap">
      <header className="top mono">
        <span>portfolio / {new Date().getFullYear()}</span>
        <Link to="/site">open the website →</Link>
      </header>
      <main>
        {/* TODO: name, role and bio come from the owner; placeholders until provided. */}
        <h1 className="name">{profile.name}</h1>
        <p className="tagline">{profile.copy.tagline}</p>
        <ol className="index" aria-label="Projects">
          {projects.map((p, i) => (
            <li key={p.slug}>
              <Link to={`/p/${p.slug}`}>
                <span className="mono">{String(i + 1).padStart(2, '0')}</span>
                <span className="title">{p.name}</span>
                <span className="mono status">{p.status}</span>
                <span className="pitch">{p.pitch}</span>
              </Link>
            </li>
          ))}
        </ol>
      </main>
      <footer id="about" className="mono"><a href={`mailto:${profile.email}`}>{profile.email}</a> · <a href={`tel:${profile.phone.replace(/s+/g, '')}`}>{profile.phone}</a> · {profile.location}</footer>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/p/:slug" element={<Landing />} />
        <Route path="/site" element={<Landing />} />
        <Route path="/site/resume" element={<Landing />} />
        <Route path="/site/p/:slug" element={<Landing />} />
        <Route path="/index" element={<ListPage />} />
        <Route path="*" element={<Landing />} />
      </Routes>
    </BrowserRouter>
  )
}
