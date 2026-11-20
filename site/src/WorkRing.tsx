import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { MotionValue } from 'framer-motion'
import { projects, type Project } from './content'

const R = 10          // ring radius; the camera sits in the middle
const H = 3.75        // card height
const ARC = 0.60      // card width as an angle (radians)
const GAP = 0.08
const STEP = ARC + GAP

const HUES: Record<string, [number, number]> = {
  cadence: [205, 175], collectorhub: [22, 48], 'evacuation-planner': [352, 18], 'light-reaction': [45, 12],
  lockout: [150, 190], 'multi-agent-research': [188, 160], novi: [38, 8], 'payment-tracker': [165, 135], vibeflow: [335, 20],
  'ride-sharing-dbms': [78, 112], 'political-bias-detection': [218, 246],
}

/** A slice of the inside of a cylinder, mirrored so pictures read correctly from the middle. */
function slice(scale: number, r = R) {
  const g = new THREE.CylinderGeometry(r, r, H * scale, 48, 1, true, Math.PI - (ARC * scale) / 2, ARC * scale)
  const uv = g.attributes.uv as THREE.BufferAttribute
  for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i))
  return g
}

function cover(tex: THREE.Texture, w: number, h: number, scale: number) {
  if (!w || !h) return
  const card = (ARC * scale * R) / (H * scale)
  const t = w / h
  if (t > card) { tex.repeat.set(card / t, 1); tex.offset.set((1 - card / t) / 2, 0) }
  else { tex.repeat.set(1, t / card); tex.offset.set(0, (1 - t / card) / 2) }
  tex.needsUpdate = true
}

function fieldTexture(slug: string, name: string) {
  let hsh = 0
  for (const ch of slug) hsh = (hsh * 31 + ch.charCodeAt(0)) % 360
  const [a] = HUES[slug] ?? [hsh]
  const c = document.createElement('canvas')
  c.width = 1024; c.height = 640
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  const draw = () => {
    const g = c.getContext('2d')!
    // near-black, with a soft hint of two colours bleeding in from opposite corners
    g.fillStyle = '#060607'
    g.fillRect(0, 0, 1024, 640)
    const bloom = (x: number, y: number, r: number, hue: number, alpha: number) => {
      const rg = g.createRadialGradient(x, y, 0, x, y, r)
      rg.addColorStop(0, `hsla(${hue} 75% 45% / ${alpha})`)
      rg.addColorStop(1, `hsla(${hue} 75% 45% / 0)`)
      g.fillStyle = rg
      g.fillRect(0, 0, 1024, 640)
    }
    bloom(150, 520, 300, a, 0.5)
    // the project name, wrapped to fit
    g.fillStyle = '#e9e3d8'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    let size = 96
    const words = name.toUpperCase().split(' ')
    const lines: string[] = []
    const fit = () => {
      g.font = `400 ${size}px Anton, Impact, sans-serif`
      lines.length = 0
      let line = ''
      for (const w of words) {
        const next = line ? `${line} ${w}` : w
        if (g.measureText(next).width > 880 && line) { lines.push(line); line = w } else line = next
      }
      lines.push(line)
    }
    fit()
    while (lines.length > 3 && size > 48) { size -= 8; fit() }
    const lh = size * 1.05
    lines.forEach((l, i) => g.fillText(l, 512, 320 + (i - (lines.length - 1) / 2) * lh))
    t.needsUpdate = true
  }
  draw()
  document.fonts?.load('96px Anton').then(draw).catch(() => {})
  return t
}

type Panel = { p: Project; group: THREE.Group; mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; veil: THREE.MeshBasicMaterial; ready: boolean; fade: number; since: number; video?: HTMLVideoElement }

/** The projects as one loop of curved screens around the viewer. Plain three.js (no react-three-fiber). */
export default function WorkRing({ pos, onOpen }: { pos: MotionValue<number>; onOpen: (slug: string) => void }) {
  const host = useRef<HTMLDivElement>(null)
  const open = useRef(onOpen)
  open.current = onOpen

  useEffect(() => {
    const el = host.current
    if (!el) return
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    el.appendChild(renderer.domElement)
    renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block'
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 50)
    camera.position.set(0, 0, 0)
    camera.lookAt(0, 0, -1)
    const loader = new THREE.TextureLoader()
    const n = projects.length

    const panels: Panel[] = projects.map((p) => {
      const scale = p.slug === 'evacuation-planner' ? 1.12 : 1
      const mat = new THREE.MeshBasicMaterial({ side: THREE.BackSide, toneMapped: false, color: 0xffffff })
      const mesh = new THREE.Mesh(slice(scale), mat)
      mesh.userData.slug = p.slug
      const group = new THREE.Group()
      group.add(mesh)
      scene.add(group)
      // a gradient veil with the project name sits in front; it fades out once the picture is playing
      const veil = new THREE.MeshBasicMaterial({ side: THREE.BackSide, toneMapped: false, transparent: true, depthWrite: false, map: fieldTexture(p.slug, p.name) })
      const veilMesh = new THREE.Mesh(slice(scale, R - 0.02), veil)
      veilMesh.renderOrder = 1
      group.add(veilMesh)
      const panel: Panel = { p, group, mesh, mat, veil, ready: false, fade: 1, since: 0 }
      const clip = p.media.loop.find((u) => u.endsWith('.mp4')) ?? p.media.loop[0]
      const still = p.media.hero ?? p.media.poster
      if (clip) {
        const v = document.createElement('video')
        v.src = clip; v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto'; v.crossOrigin = 'anonymous'
        const tex = new THREE.VideoTexture(v)
        tex.colorSpace = THREE.SRGBColorSpace
        // projects with a hype video skip the placeholder: dark until the first frame, then the video plays straight away
        panel.fade = 0
        veilMesh.visible = false
        const dark = new THREE.DataTexture(new Uint8Array([10, 10, 11, 255]), 1, 1)
        dark.colorSpace = THREE.SRGBColorSpace
        dark.needsUpdate = true
        mat.map = dark; mat.needsUpdate = true
        v.addEventListener('loadeddata', () => { cover(tex, v.videoWidth, v.videoHeight, scale); mat.map = tex; mat.needsUpdate = true; dark.dispose() })
        v.addEventListener('playing', () => { panel.ready = true })
        panel.video = v
        v.load()
      } else if (still) {
        loader.load(still, (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace
          const im = tex.image as HTMLImageElement
          cover(tex, im.width, im.height, scale)
          mat.map = tex; mat.needsUpdate = true
          panel.ready = true
        })
      }
      return panel
    })

    const resize = () => {
      const w = el.clientWidth || innerWidth, h = el.clientHeight || innerHeight
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      // on tall/narrow screens widen the field of view so the centre card still fits
      camera.fov = w / h < 1 ? 42 / Math.max(0.55, w / h) : 42
      camera.updateProjectionMatrix()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(el)

    let raf = 0
    let visible = true
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting }, { threshold: 0 })
    io.observe(el)
    const frame = () => {
      raf = requestAnimationFrame(frame)
      if (!visible) return
      const cur = pos.get()
      for (const pn of panels) {
        const i = projects.indexOf(pn.p)
        const d = i - cur
        const w = d - n * Math.round(d / n) // wrap: the cards form a loop
        pn.group.rotation.y = -w * STEP
        pn.group.visible = Math.abs(w * STEP) < 1.25
        const shade = 1 - Math.min(1, Math.abs(w)) * 0.62
        pn.mat.color.setScalar(shade)
        pn.veil.color.setScalar(shade)
        // the gradient and name hold for one second once a tile is centred, then fade to the picture
        if (Math.abs(w) < 0.5) { if (!pn.since) pn.since = performance.now() } else if (pn.fade > 0.999) pn.since = 0
        if (pn.ready && pn.since && performance.now() - pn.since > 1000) pn.fade = Math.max(0, pn.fade - 0.025)
        pn.veil.opacity = pn.fade
        pn.veil.visible = pn.fade > 0
        const v = pn.video
        if (v) { if (Math.abs(w) < 2.2) { if (v.paused) v.play().catch(() => {}) } else if (!v.paused) v.pause() }
      }
      renderer.render(scene, camera)
    }
    frame()

    // clicking a screen opens the project; a drag (scroll) does not
    const ray = new THREE.Raycaster()
    const pt = new THREE.Vector2()
    const hit = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      pt.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      ray.setFromCamera(pt, camera)
      const vis = panels.filter((x) => x.group.visible).map((x) => x.mesh)
      return ray.intersectObjects(vis, false)[0]?.object.userData.slug as string | undefined
    }
    let down: { x: number; y: number } | null = null
    const onDown = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY } }
    const onUp = (e: PointerEvent) => {
      if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 6) { const s = hit(e); if (s) open.current(s) }
      down = null
    }
    const onMove = (e: PointerEvent) => { el.style.cursor = hit(e) ? 'pointer' : '' }
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointermove', onMove)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect(); io.disconnect()
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointermove', onMove)
      for (const pn of panels) { pn.video?.pause(); pn.video?.removeAttribute('src'); pn.mat.map?.dispose(); pn.mat.dispose(); pn.veil.map?.dispose(); pn.veil.dispose(); pn.mesh.geometry.dispose() }
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [pos])

  return <div ref={host} style={{ position: 'absolute', inset: 0 }} aria-hidden />
}
