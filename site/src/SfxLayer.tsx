import { useEffect } from 'react'
import { sfx, type Sfx } from './sfx'

const INTERACTIVE = 'a, button, [role="button"], summary, label'

/** Picks a sound for whatever was clicked, from what kind of control it is. */
function soundFor(el: Element): Sfx {
  if (el.closest('.sound-toggle')) return 'tick' // the toggle plays its own on/off sound
  if (el.closest('.win-close, .win-dismiss, [aria-label^="Close"]')) return 'back'
  if (el.closest('.cta')) return 'confirm'
  if (el.closest('.icon-links, .ps-icons, .about2-links')) return 'pop'
  if (el.closest('.desk-row, .desk-reason, .ps-next, .wk-ctl, .work2-ctl')) return 'soft'
  if (el.closest('.site-bar, nav')) return 'soft'
  return 'click'
}

/** Click, hover and scroll sounds for the whole page, attached once. */
export default function SfxLayer() {
  useEffect(() => {
    let hovered: Element | null = null
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.(INTERACTIVE)
      if (el) sfx.play(soundFor(el))
    }
    const onOver = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const el = (e.target as Element | null)?.closest?.(INTERACTIVE) ?? null
      if (el && el !== hovered) sfx.play('tick')
      hovered = el
    }

    // scrolling: a soft swish that follows how fast you scroll (capture, because scroll events do not bubble)
    const last = new WeakMap<EventTarget, { y: number; t: number }>()
    const onScroll = (e: Event) => {
      const t = e.target as HTMLElement | Document
      const y = t instanceof Document ? scrollY : (t as HTMLElement).scrollTop
      const now = performance.now()
      const prev = last.get(t)
      last.set(t, { y, t: now })
      if (!prev) return
      const dt = Math.max(1, now - prev.t)
      const speed = Math.abs(y - prev.y) / dt // pixels per millisecond
      if (speed > 0.9) {
        const w = document.getElementById('work')?.getBoundingClientRect()
        if (w && w.top <= 0 && w.bottom >= innerHeight * 0.5) return // the Work section has its own swoosh
        sfx.play('glide', Math.min(1, speed / 4))
      }
    }

    document.addEventListener('click', onClick, true)
    document.addEventListener('pointerover', onOver, true)
    document.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('pointerover', onOver, true)
      document.removeEventListener('scroll', onScroll, true)
    }
  }, [])
  return null
}
