import { useEffect, useRef, useState } from 'react'

type Mode = 'Sync' | 'Manual' | 'Off'
type Rgb = [number, number, number]
const SCENES = ['Dark film', 'Sports', 'Game UI'] as const
const PRESETS: [string, string][] = [['Warm Cinema', '#FFB74D'], ['Sci-Fi Cyan', '#00F0FF'], ['Sunset Gold', '#FF6D00'], ['Clean White', '#FFFFFF'], ['Gaming Red', '#FF1744']]
const hexToRgb = (h: string): Rgb => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb
const diff = (a: Rgb, b: Rgb) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) // same Manhattan distance as the app
const hex2 = (n: number) => n.toString(16).padStart(2, '0').toUpperCase()

// Generated scenes (no third-party footage).
function draw(ctx: CanvasRenderingContext2D, scene: number, t: number, w: number, h: number) {
  if (scene === 0) {
    ctx.fillStyle = '#06080c'; ctx.fillRect(0, 0, w, h)
    const k = (Math.sin(t * 0.0006) + 1) / 2
    const g = ctx.createRadialGradient(w * (0.3 + 0.4 * k), h * 0.55, 4, w * (0.3 + 0.4 * k), h * 0.55, h * 0.8)
    g.addColorStop(0, `rgb(${30 + 60 * k},${90 + 40 * (1 - k)},${120 + 40 * (1 - k)})`); g.addColorStop(1, '#06080c')
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
  } else if (scene === 1) {
    ctx.fillStyle = '#2f9a3f'; ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#e8f5e8'; ctx.fillRect(((t * 0.05) % (w + 40)) - 40, 0, 6, h)
    ctx.beginPath(); ctx.arc(w / 2 + Math.sin(t * 0.002) * 90, h / 2 + Math.cos(t * 0.003) * 40, 10, 0, 7); ctx.fill()
  } else {
    const flash = Math.floor(t / 900) % 3
    ctx.fillStyle = ['#1a0b0e', '#3a0d12', '#0d1a30'][flash]; ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = ['#ff3b30', '#ff9f0a', '#30d5ff'][flash]; ctx.fillRect(w * 0.1, h * 0.8, w * 0.8 * (((t % 900) / 900)), 10)
  }
}

export default function LightDemo() {
  const [mode, setMode] = useState<Mode>('Sync')
  const [scene, setScene] = useState(0)
  const [fps, setFps] = useState(8)
  const [threshold, setThreshold] = useState(12)
  const [brightness, setBrightness] = useState(100)
  const [manual, setManual] = useState('#FFB74D')
  const [light, setLight] = useState<Rgb>([0, 0, 0])
  const [packets, setPackets] = useState(0)
  const canvas = useRef<HTMLCanvasElement>(null)
  const tiny = useRef<HTMLCanvasElement | null>(null)
  const last = useRef<Rgb>([0, 0, 0])
  const sceneRef = useRef(scene)
  sceneRef.current = scene
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    const c = canvas.current!; const ctx = c.getContext('2d')!
    if (!tiny.current) { tiny.current = document.createElement('canvas'); tiny.current.width = tiny.current.height = 1 }
    const id = window.setInterval(() => draw(ctx, sceneRef.current, reduced ? 3000 : performance.now(), c.width, c.height), 33)
    return () => clearInterval(id)
  }, [reduced])

  useEffect(() => {
    if (mode === 'Off') { setLight([0, 0, 0]); return }
    if (mode === 'Manual') { setLight(hexToRgb(manual).map((v) => Math.round((v * brightness) / 100)) as Rgb); return }
    const id = window.setInterval(() => {
      if (!canvas.current || !tiny.current) return
      const tctx = tiny.current.getContext('2d', { willReadFrequently: true })!
      tctx.drawImage(canvas.current!, 0, 0, 1, 1) // downscale to 1x1, as the real app does
      const d = tctx.getImageData(0, 0, 1, 1).data
      const rgb: Rgb = [d[0], d[1], d[2]]
      if (diff(rgb, last.current) >= threshold) {
        last.current = rgb
        setPackets((p) => p + 1)
        setLight(rgb.map((v) => Math.round((v * brightness) / 100)) as Rgb)
      }
    }, 1000 / fps)
    return () => clearInterval(id)
  }, [mode, fps, threshold, brightness, manual])

  const css = `rgb(${light.join(',')})`
  return (
    <div className="demo">
      <p className="mono demo-note">Browser re-creation: scene → 1×1 pixel → threshold check → light. Scenes are generated. No Bluetooth involved.</p>
      <div className="light-stage">
        <canvas ref={canvas} width={320} height={180} className="light-screen" aria-label="Fake monitor scene" />
        <div className="light-strip" style={{ background: css, boxShadow: `0 0 48px 12px ${css}` }} aria-label={`Light colour ${css}`} />
      </div>
      <p className="mono">RGB({light.join(', ')}) · #{light.map(hex2).join('')} · packets sent {packets}</p>
      <p className="mono dim">packet: 7E 07 05 03 {light.map(hex2).join(' ')} 00 EF</p>
      <div className="demo-row">
        {(['Sync', 'Manual', 'Off'] as Mode[]).map((m) => <button key={m} className={`btn small ${m === mode ? 'on' : ''}`} onClick={() => setMode(m)}>{m}</button>)}
        {SCENES.map((s, i) => <button key={s} className={`btn small ${i === scene ? 'on' : ''}`} onClick={() => setScene(i)}>{s}</button>)}
      </div>
      <div className="demo-row toggles">
        <label>FPS {fps} <input type="range" min={3} max={15} value={fps} onChange={(e) => setFps(+e.target.value)} /></label>
        <label>threshold {threshold} <input type="range" min={1} max={30} value={threshold} onChange={(e) => setThreshold(+e.target.value)} /></label>
        <label>brightness {brightness}% <input type="range" min={5} max={100} value={brightness} onChange={(e) => setBrightness(+e.target.value)} /></label>
      </div>
      {mode === 'Manual' && (
        <div className="demo-row">{PRESETS.map(([n, c]) => <button key={n} className="btn small" onClick={() => setManual(c)}>{n}</button>)}</div>
      )}
    </div>
  )
}
