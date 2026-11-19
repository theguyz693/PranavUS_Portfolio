import { useEffect, useRef } from 'react'

/**
 * A small ring that follows the pointer with a little lag, grows over links and buttons,
 * and turns into an "Open" bubble over work cards. Mouse only: touch screens keep their normal behaviour.
 */
export default function CustomCursor() {
  const ring = useRef<HTMLDivElement>(null)
  const label = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (matchMedia('(pointer: coarse)').matches) return
    const el = ring.current
    const txt = label.current
    if (!el || !txt) return
    document.documentElement.classList.add('has-cursor')

    const pos = { x: -100, y: -100 }
    const cur = { x: -100, y: -100 }
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const move = (e: PointerEvent) => {
      pos.x = e.clientX; pos.y = e.clientY
      const t = e.target as Element | null
      const card = t?.closest?.('.wcard')
      const link = t?.closest?.('a, button, [role="button"], summary')
      el.classList.toggle('view', !!card)
      el.classList.toggle('big', !!link && !card)
      txt.textContent = card ? 'Open' : ''
      el.classList.remove('hide')
    }
    const leave = () => el.classList.add('hide')
    window.addEventListener('pointermove', move)
    document.addEventListener('pointerleave', leave)

    let raf = 0
    const loop = () => {
      const k = reduce ? 1 : 0.22
      cur.x += (pos.x - cur.x) * k
      cur.y += (pos.y - cur.y) * k
      el.style.transform = `translate3d(${cur.x}px, ${cur.y}px, 0)`
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', move)
      document.removeEventListener('pointerleave', leave)
      document.documentElement.classList.remove('has-cursor')
    }
  }, [])

  return (
    <div ref={ring} className="cursor hide" aria-hidden>
      <span ref={label} className="cursor-label" />
    </div>
  )
}
