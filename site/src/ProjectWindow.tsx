import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ProjectSite } from './ProjectSite'
import { bySlug } from './content'

/** The project as a near-full-screen window, like a task opening in a game. */
export default function ProjectWindow({ slug, base, reduced }: { slug: string; base: 'room' | 'site'; reduced: boolean }) {
  const p = bySlug(slug)
  const closeTo = base === 'site' ? '/site' : '/'
  const scroller = useRef<HTMLDivElement>(null)
  const win = useRef<HTMLDivElement>(null)

  useEffect(() => { win.current?.focus() }, [])
  useEffect(() => { scroller.current?.scrollTo({ top: 0 }) }, [slug])
  if (!p) return null

  // From the room the folder animation plays first; from the website it opens at once.
  const delay = base === 'room' && !reduced ? 1.1 : 0
  return (
    <motion.div
      className="win-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduced ? 0 : 0.25, delay }}
    >
      <Link to={closeTo} className="win-dismiss" aria-label="Close project" tabIndex={-1} />
      <motion.div
        ref={win}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`${p.name} project`}
        className="win"
        initial={reduced ? { opacity: 0 } : { scale: 0.86, y: 24, opacity: 0 }}
        animate={reduced ? { opacity: 1 } : { scale: 1, y: 0, opacity: 1 }}
        exit={reduced ? { opacity: 0 } : { scale: 0.92, y: 16, opacity: 0 }}
        transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 26, delay }}
      >
        <div className="win-bar">
          <span>{p.name}</span>
          <Link to={closeTo} className="win-close">Close <kbd>esc</kbd></Link>
        </div>
        <div className="win-scroll" ref={scroller}>
          <ProjectSite key={slug} p={p} basePath={base === 'site' ? '/site/p' : '/p'} reduced={reduced} />
        </div>
      </motion.div>
    </motion.div>
  )
}
