import { useEffect, useRef } from 'react'

/**
 * Soft, slowly drifting dark blobs that lean toward the pointer, like smoke that notices you.
 * Fixed behind the whole site; a grain layer sits above it. Static when reduced motion is on.
 */
export default function ReactiveBg({ host, reduced }: { host: React.RefObject<HTMLDivElement | null>; reduced: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const c = canvas.current
    const h = host.current
    if (!c || !h) return
    const ctx = c.getContext('2d')!
    let w = 0, hh = 0
    const resize = () => { w = innerWidth; hh = innerHeight; c.width = w / 2; c.height = hh / 2 } // half resolution: it is blurred anyway
    resize()
    window.addEventListener('resize', resize)

    const COLORS = ['70,74,86', '58,52,48', '88,66,44', '52,60,70', '66,58,64', '44,48,56']
    const blobs = COLORS.map((col, i) => ({
      col, x: Math.random() * w, y: Math.random() * hh, r: 0.22 + Math.random() * 0.2,
      vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25, pull: 0.0006 + i * 0.00025,
    }))
    const pointer = { x: w / 2, y: hh / 2 }
    const onMove = (e: PointerEvent) => { pointer.x = e.clientX; pointer.y = e.clientY }
    h.addEventListener('pointermove', onMove)

    let raf = 0
    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height)
      ctx.globalCompositeOperation = 'lighter'
      for (const b of blobs) {
        if (!reduced) {
          b.vx += (pointer.x - b.x) * b.pull; b.vy += (pointer.y - b.y) * b.pull
          b.vx *= 0.985; b.vy *= 0.985
          b.x += b.vx; b.y += b.vy
          if (b.x < -100 || b.x > w + 100) b.vx *= -1
          if (b.y < -100 || b.y > hh + 100) b.vy *= -1
        }
        const R = b.r * Math.max(w, hh) * 0.5
        const g = ctx.createRadialGradient(b.x / 2, b.y / 2, 0, b.x / 2, b.y / 2, R / 2)
        g.addColorStop(0, `rgba(${b.col},0.55)`)
        g.addColorStop(1, `rgba(${b.col},0)`)
        ctx.fillStyle = g
        ctx.fillRect(0, 0, c.width, c.height)
      }
      if (!reduced) raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); h.removeEventListener('pointermove', onMove); window.removeEventListener('resize', resize) }
  }, [host, reduced])

  return <canvas ref={canvas} className="reactive-bg" aria-hidden />
}
