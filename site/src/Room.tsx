import { Suspense, useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, useGLTF } from '@react-three/drei'
import { useNavigate } from 'react-router-dom'
import * as THREE from 'three'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { roomProjects as projects } from './content'
import { istNow, skyAt } from './daylight'

const ACCENT = '#ffb454'
export type RoomView = 'home' | 'monitor' | 'shelf'

const M = {
  table: '/models/table.glb',
  monitor: '/models/monitor.glb',
  keyboard: '/models/keyboard.glb',
  mug: '/models/nescafe.glb',
  lamp: '/models/lamp.glb',
  binders: '/models/binders.glb',
  room: '/models/room.glb',
  alarm: '/models/alarmclock.glb',
  box: '/models/toys/box.glb',
  charizard: '/models/toys/charizard.glb',
  sova: '/models/toys/sova.glb',
  cola: '/models/toys/cola.glb',
  redbull: '/models/toys/redbull.glb',
  skyline: '/models/toys/skyline.glb',
  katana: '/models/toys/katana.glb',
  chibi: '/models/toys/chibi.glb',
  spiderman: '/models/toys/spiderman.glb',
  delorean: '/models/toys/delorean.glb',
  claude: '/models/toys/claude.glb',
}
Object.values(M).forEach((u) => useGLTF.preload(u))

type Dims = { w: number; h: number; d: number }

/** Bounding box of the visible meshes under `root`, in root's parent space. */
function measure(root: THREE.Object3D): THREE.Box3 {
  root.updateWorldMatrix(true, true)
  const box = new THREE.Box3()
  root.traverse((o) => {
    if (!(o as THREE.Mesh).isMesh) return
    let vis = true
    for (let p: THREE.Object3D | null = o; p; p = p.parent) if (!p.visible) vis = false
    if (vis) box.expandByObject(o)
  })
  return box
}

/** Scale an object so one dimension matches the target, and put its bottom centre at the origin. */
function fitObject(src: THREE.Object3D, target: { w?: number; h?: number; d?: number; m?: number }) {
  const root = new THREE.Group()
  root.add(src)
  const box = measure(root)
  const size = box.getSize(new THREE.Vector3())
  const s = target.m ? target.m / Math.max(size.x, size.y, size.z) : target.w ? target.w / size.x : target.h ? target.h / size.y : (target.d ?? 1) / size.z
  const c = box.getCenter(new THREE.Vector3())
  const offset = new THREE.Vector3(-c.x * s, -box.min.y * s, -c.z * s)
  return { root, s, offset, dims: { w: size.x * s, h: size.y * s, d: size.z * s } as Dims }
}

function Fitted({ url, target, position = [0, 0, 0], rotation = [0, 0, 0], hide = [], children }: {
  url: string
  target: { w?: number; h?: number; d?: number }
  position?: [number, number, number]
  rotation?: [number, number, number]
  hide?: string[]
  children?: (dims: Dims) => ReactNode
}) {
  const gltf = useGLTF(url)
  const fit = useMemo(() => {
    const clone = gltf.scene.clone(true)
    clone.traverse((o) => { if (hide.includes(o.name)) o.visible = false })
    return fitObject(clone, target)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gltf])
  return (
    <group position={position} rotation={rotation}>
      <group position={fit.offset} scale={fit.s}><primitive object={fit.root} /></group>
      {children?.(fit.dims)}
    </group>
  )
}

/** The alarm clock, with its baked-in display covered by a live readout of the time in India (IST). */
function AlarmClock({ position, rotation }: { position: [number, number, number]; rotation: [number, number, number] }) {
  const gltf = useGLTF(M.alarm)
  const invalidate = useThree((s) => s.invalidate)
  const fit = useMemo(() => {
    const f = fitObject(gltf.scene.clone(true), { h: 0.2 })
    f.root.updateWorldMatrix(true, true)
    const node = f.root.getObjectByName('Object_16') // the model's screen
    const box = node ? new THREE.Box3().setFromObject(node) : new THREE.Box3(new THREE.Vector3(-0.5, 0.2, 0), new THREE.Vector3(0.5, 0.6, 0.1))
    const c = box.getCenter(new THREE.Vector3()).multiplyScalar(f.s).add(f.offset)
    const size = box.getSize(new THREE.Vector3()).multiplyScalar(f.s)
    return { ...f, screen: { c, w: size.x, h: size.y, front: box.max.z * f.s + f.offset.z } }
  }, [gltf])

  const { canvas, tex } = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256; canvas.height = Math.max(32, Math.round(256 * (fit.screen.h / fit.screen.w)))
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    return { canvas, tex }
  }, [fit])

  useEffect(() => {
    const draw = () => {
      const { h, m, s } = istNow()
      const h12 = ((h + 11) % 12) + 1
      const colon = s % 2 === 0 ? ':' : ' '
      const g = canvas.getContext('2d')!
      g.fillStyle = '#0a0c0e'; g.fillRect(0, 0, canvas.width, canvas.height)
      g.fillStyle = '#e9f2ff'; g.textAlign = 'center'; g.textBaseline = 'middle'
      g.font = `700 ${Math.round(canvas.height * 0.62)}px ui-monospace, "Courier New", monospace`
      g.fillText(`${String(h12).padStart(2, '0')}${colon}${String(m).padStart(2, '0')}`, canvas.width * 0.46, canvas.height * 0.52)
      g.font = `600 ${Math.round(canvas.height * 0.2)}px ui-monospace, monospace`
      g.textAlign = 'right'
      g.fillText(h >= 12 ? 'PM' : 'AM', canvas.width * 0.97, canvas.height * 0.28)
      g.fillText('IST', canvas.width * 0.97, canvas.height * 0.78)
      tex.needsUpdate = true
      invalidate()
    }
    draw()
    const id = window.setInterval(draw, 1000)
    return () => clearInterval(id)
  }, [canvas, tex, invalidate])

  const { c, w, h, front } = fit.screen
  return (
    <group position={position} rotation={rotation}>
      <group position={fit.offset} scale={fit.s}><primitive object={fit.root} /></group>
      <mesh position={[c.x, c.y, front + 0.0015]}>
        <planeGeometry args={[w * 0.96, h * 0.96]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** Easter egg: double-click the cup and it hops to another free spot on the desk. */
const CUP_SPOTS: [number, number][] = [
  [1.2, 0.3], [1.45, 0.05], [1.05, 0.45], [1.6, 0.4], [1.15, 0.0],
  [-0.9, 0.35], [-0.7, 0.5], [-1.05, 0.15],
]
function Cup({ deskTop }: { deskTop: number }) {
  const gltf = useGLTF(M.mug)
  const fit = useMemo(() => fitObject(gltf.scene.clone(true), { h: 0.18 }), [gltf])
  const group = useRef<THREE.Group>(null)
  const move = useRef({ from: new THREE.Vector2(1.2, 0.3), to: new THREE.Vector2(1.2, 0.3), t: 1, spin: -0.6, spinTo: -0.6, spot: 0 })
  const invalidate = useThree((s) => s.invalidate)

  const hop = () => {
    const m = move.current
    if (m.t < 1) return
    let next = m.spot
    while (next === m.spot) next = Math.floor(Math.random() * CUP_SPOTS.length)
    m.spot = next
    m.from.copy(m.to)
    m.to.set(CUP_SPOTS[next][0], CUP_SPOTS[next][1])
    m.spin = m.spinTo
    m.spinTo = m.spin + (Math.random() - 0.5) * 2.4
    m.t = 0
    invalidate()
  }

  useFrame((state, dt) => {
    const g = group.current
    if (!g) return
    const m = move.current
    if (m.t < 1) { m.t = Math.min(1, m.t + dt / 0.55); state.invalidate() }
    const e = m.t * m.t * (3 - 2 * m.t)
    g.position.set(THREE.MathUtils.lerp(m.from.x, m.to.x, e), deskTop + Math.sin(Math.PI * m.t) * 0.16, THREE.MathUtils.lerp(m.from.y, m.to.y, e))
    g.rotation.y = THREE.MathUtils.lerp(m.spin, m.spinTo, e)
  })

  return (
    <group
      ref={group}
      position={[1.2, deskTop, 0.3]}
      onDoubleClick={(e) => { e.stopPropagation(); if (e.delta > 6) return; hop() }}
    >
      <group position={fit.offset} scale={fit.s}><primitive object={fit.root} /></group>
    </group>
  )
}

/** A toy that pops out of the box on a small arc and lands beside it (and back in when the box is closed). */
interface ToyDef { url: string; target: { h?: number; d?: number; m?: number }; rx?: number; end: [number, number]; endY?: number; yaw: number; tilt?: number }
function Toy({ def, open, index, boxTop }: { def: ToyDef; open: boolean; index: number; boxTop: number }) {
  const gltf = useGLTF(def.url)
  // SkeletonUtils.clone keeps rigged models (like the Lego figure) intact
  const fit = useMemo(() => {
    const src = cloneSkinned(gltf.scene)
    if (def.rx) src.rotation.x = def.rx // some models are authored lying flat
    return fitObject(src, def.target)
  }, [gltf, def])
  const group = useRef<THREE.Group>(null)
  const p = useRef(0)
  const spin = useMemo(() => (index % 2 ? 1 : -1) * (1.2 + index * 0.25), [index])

  useFrame((state, dt) => {
    const g = group.current
    if (!g) return
    const goal = open ? 1 : 0
    const delay = open ? index * 0.07 : Math.max(0, TOYS.length - index) * 0.03
    const speed = 1 / 0.75
    if (p.current !== goal) {
      state.invalidate()
      const step = dt * speed
      // simple stagger: hold still for `delay` seconds after a toggle
      const t0 = (g.userData.t0 ??= performance.now())
      if ((performance.now() - t0) / 1000 < delay) return
      p.current = goal > p.current ? Math.min(goal, p.current + step) : Math.max(goal, p.current - step)
    } else g.userData.t0 = undefined
    const e = p.current * p.current * (3 - 2 * p.current)
    g.visible = p.current > 0.001
    const endY = def.endY ?? 0
    g.position.set(def.end[0] * e, boxTop + (endY - boxTop) * e + Math.sin(Math.PI * p.current) * 0.7, def.end[1] * e)
    g.scale.setScalar(0.25 + 0.75 * e)
    g.rotation.set(0, def.yaw + spin * (1 - e), (def.tilt ?? 0) * e)
  })

  return (
    <group ref={group} visible={false}>
      <group position={fit.offset} scale={fit.s}><primitive object={fit.root} /></group>
    </group>
  )
}

const TOYS: ToyDef[] = [
  { url: M.charizard, target: { h: 0.55 }, end: [0.65, 0.1], yaw: -0.6 },
  { url: M.sova, target: { h: 0.85 }, end: [0.8, -0.4], yaw: -0.3 },
  { url: M.skyline, target: { d: 0.85 }, end: [1.25, -0.05], yaw: 0.5 },
  { url: M.cola, target: { h: 0.3 }, end: [0.5, -0.85], yaw: 0 },
  { url: M.redbull, target: { h: 0.3 }, end: [0.85, -0.9], yaw: 0 },
  { url: M.katana, target: { h: 1.0 }, end: [-0.45, -1.0], yaw: 0.8, tilt: 0.16 },
  { url: M.chibi, target: { h: 0.12 }, end: [0.05, 0.0], yaw: 0.4, endY: 0.5 },
  { url: M.spiderman, target: { h: 0.4 }, end: [0.4, 0.6], yaw: 0.2 },
  { url: M.delorean, target: { h: 0.4 }, end: [1.0, 0.65], yaw: 0.7 },
  { url: M.claude, target: { m: 0.3 }, end: [1.65, 0.35], yaw: 0.7, tilt: -0.08 },
]

/** Easter egg under the window: click the cardboard box and it shakes, then a pile of toys pops out. */
function ToyBox({ position }: { position: [number, number, number] }) {
  const gltf = useGLTF(M.box)
  const fit = useMemo(() => fitObject(gltf.scene.clone(true), { h: 0.5 }), [gltf])
  const [open, setOpen] = useState(false)
  const [hot, setHot] = useState(false)
  // tell the camera when the box opens or closes
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    window.dispatchEvent(new CustomEvent('room:toys', { detail: open }))
  }, [open])
  const shake = useRef(0)
  const wob = useRef<THREE.Group>(null)

  useFrame((state, dt) => {
    if (shake.current > 0.001 && wob.current) {
      shake.current = Math.max(0, shake.current - dt * 1.6)
      wob.current.rotation.z = Math.sin(state.clock.elapsedTime * 38) * 0.07 * shake.current
      state.invalidate()
    } else if (wob.current) wob.current.rotation.z = 0
  })

  return (
    <group position={position}>
      <group
        ref={wob}
        rotation={[0, 0.35, 0]}
        onPointerOver={(e) => { e.stopPropagation(); setHot(true); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { setHot(false); document.body.style.cursor = '' }}
        onClick={(e) => { e.stopPropagation(); if (e.delta > 6) return; shake.current = 1; setOpen((o) => !o) }}
      >
        <group position={fit.offset} scale={fit.s}><primitive object={fit.root} /></group>
        {hot && (
          <Html position={[0, fit.dims.h + 0.2, 0]} center style={{ pointerEvents: 'none' }}>
            <div className="room-label mono">{open ? 'pack it up' : 'open me'}</div>
          </Html>
        )}
      </group>
      {/* extra light only while the box is open, so a closed box stays dim and tucked away */}
      <pointLight position={[0.9, 1.3, 0.2]} intensity={open ? 14 : 0} distance={6} color="#ffd9b0" decay={2} />
      <pointLight position={[0.6, 0.5, 1.0]} intensity={open ? 4 : 0} distance={3} color="#ffe9d0" decay={2} />
      {TOYS.map((t, i) => <Toy key={t.url} def={t} index={i} open={open} boxTop={fit.dims.h} />)}
    </group>
  )
}

function Box({ args, position, color = '#1a1b1f', rough = 0.9 }: {
  args: [number, number, number]; position: [number, number, number]; color?: string; rough?: number
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={args} />
      <meshStandardMaterial color={color} roughness={rough} />
    </mesh>
  )
}

/** The room model: floor, ceiling, three walls and a window on the left. Recoloured to the dark palette. */
function RoomShell({ windowMat }: { windowMat: THREE.Material }) {
  const gltf = useGLTF(M.room)
  const root = useMemo(() => {
    const s = gltf.scene.clone(true)
    const colors: Record<string, string> = { Object_6: '#101114', Object_7: '#0e0f12', Object_2: '#17181c', Object_4: '#17181c', Object_5: '#17181c' }
    s.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      if (o.name === 'Object_3') m.material = windowMat // window glass: its colour follows the time of day
      else if (colors[o.name]) m.material = new THREE.MeshStandardMaterial({ color: colors[o.name], roughness: 0.95 })
    })
    return s
  }, [gltf, windowMat])
  // scaled 0.4 so the back wall sits at z -1.6 and the left wall at x -4.7, floor top at y 0
  return <group position={[-0.136, -0.1, 2.92]} scale={0.4}><primitive object={root} /></group>
}

/** One shelf of 9 binders (3 rows of 3): the first 9 projects. The website lists every project. */
const SHELF_X = [-3.05]
const SHELF_SLOTS = 9
const slot = (i: number) => ({ unit: 0, row: Math.floor(i / 3), col: i % 3 })
function ShelfUnit({ x, rows }: { x: number; rows: number }) {
  const H = 0.14 + rows * 0.82
  return (
    <>
      <Box args={[1.55, H, 0.04]} position={[x, H / 2, -1.3]} color="#16171a" />
      <Box args={[0.05, H, 0.55]} position={[x - 0.77, H / 2, -1.05]} color="#1c1d21" />
      <Box args={[0.05, H, 0.55]} position={[x + 0.77, H / 2, -1.05]} color="#1c1d21" />
      {Array.from({ length: rows }, (_, k) => <Box key={k} args={[1.6, 0.04, 0.55]} position={[x, 0.76 + k * 0.82, -1.05]} color="#1c1d21" />)}
    </>
  )
}
/** Warm light from the side of the room so the binders read clearly. */
function ShelfLight({ x, side }: { x: number; side: 1 | -1 }) {
  const target = useMemo(() => new THREE.Object3D(), [])
  return (
    <>
      <spotLight position={[x + side * 1.85, 3.1, 2.6]} target={target} angle={0.55} penumbra={0.85} intensity={90} distance={10} decay={2} color="#ffe2bd" />
      <primitive object={target} position={[x, 1.3, -1.05]} />
    </>
  )
}

const BINDER_NODES = ['folder_LP_Bills_Folder_Bills_0', 'folder_LP_TaxRecords_Folder_TaxRecords_0', 'folder_LP_House_Folder_House_0']

/** A ring binder. Active: pulled off the shelf, turned to face the camera, and a cover swings open like a book. */
function Folder({ index, position, active, anyActive }: { index: number; position: [number, number, number]; active: boolean; anyActive: boolean }) {
  const p = projects[index]
  const nav = useNavigate()
  const gltf = useGLTF(M.binders)
  const group = useRef<THREE.Group>(null)
  const cover = useRef<THREE.Group>(null)
  const [hot, setHot] = useState(false)
  const pull = useRef(0)
  const open = useRef(0)
  // the camera moves under a still pointer, so clear stale hover whenever a project opens or closes
  useEffect(() => { setHot(false) }, [anyActive])

  const fit = useMemo(() => {
    const node = gltf.nodes[BINDER_NODES[index % 3]].clone(true)
    node.position.set(0, 0, 0)
    // own material per binder: clones share materials, so a hover glow would otherwise bleed to the rest of the column
    node.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.material = (m.material as THREE.Material).clone() })
    return fitObject(node, { h: 0.7 + (index % 3) * 0.04 })
  }, [gltf, index])
  const { w: t, h, d } = fit.dims
  const glow = hot || active

  // the model's own label strip reads "Bills" etc., so cover it with this project's name
  const labelTex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 96; c.height = 320
    const g = c.getContext('2d')!
    g.fillStyle = '#e9e6df'; g.fillRect(0, 0, 96, 320)
    g.save(); g.translate(58, 160); g.rotate(-Math.PI / 2)
    g.fillStyle = '#16171a'; g.font = '600 38px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'
    g.fillText(p.name, 0, 0, 290)
    g.restore()
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [p.name])

  // emissive tint on hover / active
  useEffect(() => {
    fit.root.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined
      if (m && 'emissive' in m) { m.emissive = new THREE.Color(glow ? ACCENT : '#000000'); m.emissiveIntensity = glow ? 0.3 : 0 }
    })
  }, [glow, fit])

  useFrame((_, dt) => {
    if (!group.current) return
    pull.current = THREE.MathUtils.damp(pull.current, active ? 1 : 0, 6, dt)
    open.current = THREE.MathUtils.damp(open.current, active && pull.current > 0.85 ? 1 : 0, 5, dt)
    const hover = hot && !active ? 0.14 : 0
    group.current.position.z = position[2] + hover + pull.current * 1.0
    group.current.position.y = position[1] + pull.current * 0.04
    group.current.rotation.y = -1.17 * pull.current
    if (cover.current) cover.current.rotation.y = -open.current * 2.75
  })

  const set = (v: boolean) => { setHot(v); document.body.style.cursor = v ? 'pointer' : '' }

  return (
    <group
      ref={group}
      position={position}
      onPointerOver={(e) => { e.stopPropagation(); set(true) }}
      onPointerOut={() => set(false)}
      onClick={(e) => { e.stopPropagation(); if (e.delta > 6) return; if (!active) nav(`/p/${p.slug}`) }}
    >
      <group position={fit.offset} scale={fit.s}><primitive object={fit.root} /></group>
      <mesh position={[0, h * 0.68, d / 2 + 0.004]}>
        <planeGeometry args={[t * 0.62, h * 0.4]} />
        <meshStandardMaterial map={labelTex} roughness={0.9} />
      </mesh>
      {/* pages and cover sit on the +x face (the big side) and swing open on the spine edge */}
      <mesh position={[t / 2 + 0.002, h / 2, 0]}>
        <boxGeometry args={[0.004, h - 0.06, d - 0.08]} />
        <meshStandardMaterial color="#d8d4cb" roughness={0.9} emissive="#d8d4cb" emissiveIntensity={0.3} />
      </mesh>
      <group ref={cover} position={[t / 2 + 0.004, h / 2, d / 2]}>
        <mesh position={[0.004, 0, -d / 2]}>
          <boxGeometry args={[0.008, h - 0.02, d - 0.02]} />
          <meshStandardMaterial color="#1b1c20" roughness={0.7} emissive={glow ? ACCENT : '#000000'} emissiveIntensity={glow ? 0.3 : 0} />
        </mesh>
      </group>
      {hot && !active && (
        <Html position={[0, h + 0.18, d / 2]} center style={{ pointerEvents: 'none' }}>
          <div className="room-label mono">{p.slug} / {p.status}</div>
        </Html>
      )}
    </group>
  )
}

const rr = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath()
}

/** A small stylised desktop: dusk wallpaper, menu bar, a portfolio window and a dock. */
function drawDesktop(g: CanvasRenderingContext2D, W: number, H: number, hot: boolean, active: boolean) {
  // wallpaper
  const sky = g.createLinearGradient(0, 0, 0, H)
  sky.addColorStop(0, '#1a2640'); sky.addColorStop(0.55, '#394a6c'); sky.addColorStop(1, '#bf8a6c')
  g.fillStyle = sky; g.fillRect(0, 0, W, H)
  const sun = g.createRadialGradient(W * 0.74, H * 0.66, 0, W * 0.74, H * 0.66, H * 0.42)
  sun.addColorStop(0, 'rgba(255,218,160,0.6)'); sun.addColorStop(1, 'rgba(255,218,160,0)')
  g.fillStyle = sun; g.fillRect(0, 0, W, H)
  g.fillStyle = '#18233f'; g.beginPath(); g.moveTo(0, H * 0.8); g.quadraticCurveTo(W * 0.25, H * 0.6, W * 0.5, H * 0.78); g.quadraticCurveTo(W * 0.78, H * 0.62, W, H * 0.74); g.lineTo(W, H); g.lineTo(0, H); g.fill()
  g.fillStyle = '#101831'; g.beginPath(); g.moveTo(0, H * 0.9); g.quadraticCurveTo(W * 0.35, H * 0.74, W * 0.62, H * 0.88); g.quadraticCurveTo(W * 0.85, H * 0.78, W, H * 0.86); g.lineTo(W, H); g.lineTo(0, H); g.fill()

  // menu bar
  g.fillStyle = 'rgba(8,10,16,0.55)'; g.fillRect(0, 0, W, H * 0.075)
  g.fillStyle = '#e8e5de'; g.textBaseline = 'middle'; g.textAlign = 'left'
  g.font = `600 ${H * 0.036}px "Geist", system-ui, sans-serif`
  g.fillText('Pranav   File   Edit   View   Window', W * 0.02, H * 0.039)
  g.textAlign = 'right'
  const t = istNow()
  g.fillText(`${String(t.h).padStart(2, '0')}:${String(t.m).padStart(2, '0')}`, W * 0.98, H * 0.039)

  // the portfolio window
  const wx = W * 0.16, wy = H * 0.15, ww = W * 0.68, wh = H * 0.6
  g.save(); g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 28; g.shadowOffsetY = 10
  rr(g, wx, wy, ww, wh, 16); g.fillStyle = '#0d0f14'; g.fill(); g.restore()
  g.fillStyle = '#171a21'; rr(g, wx, wy, ww, wh * 0.11, 16); g.fill(); g.fillRect(wx, wy + wh * 0.06, ww, wh * 0.05)
  ;['#d8b878', '#8a8c92', '#8a8c92'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(wx + ww * 0.04 + i * ww * 0.03, wy + wh * 0.055, wh * 0.018, 0, 7); g.fill() })
  g.fillStyle = '#8a8c92'; g.font = `500 ${H * 0.03}px "JetBrains Mono", ui-monospace, monospace`; g.textAlign = 'center'
  g.fillText('portfolio', wx + ww / 2, wy + wh * 0.055)
  // page content: the wordmark and some placeholder lines
  g.textAlign = 'left'; g.fillStyle = '#ede9e1'
  g.font = `500 ${H * 0.13}px "Playfair Display", Georgia, serif`
  g.fillText('PRANAV', wx + ww * 0.06, wy + wh * 0.42)
  g.fillText('U S', wx + ww * 0.06, wy + wh * 0.72)
  g.fillStyle = 'rgba(237,233,225,0.18)'
  rr(g, wx + ww * 0.62, wy + wh * 0.3, ww * 0.3, wh * 0.035, 6); g.fill()
  rr(g, wx + ww * 0.62, wy + wh * 0.38, ww * 0.24, wh * 0.035, 6); g.fill()
  rr(g, wx + ww * 0.62, wy + wh * 0.46, ww * 0.28, wh * 0.035, 6); g.fill()
  g.fillStyle = '#d8b878'; rr(g, wx + ww * 0.62, wy + wh * 0.62, ww * 0.16, wh * 0.09, 8); g.fill()

  // dock
  const dw = W * 0.44, dh = H * 0.105, dx = (W - dw) / 2, dy = H * 0.86
  g.fillStyle = 'rgba(255,255,255,0.16)'; rr(g, dx, dy, dw, dh, 20); g.fill()
  ;['#d8b878', '#7fb0d6', '#8cc7a1', '#d98a7a', '#e6d28a', '#a9b3c4'].forEach((c, i) => {
    g.fillStyle = c; rr(g, dx + dw * (0.055 + i * 0.152), dy + dh * 0.17, dh * 0.66, dh * 0.66, 10); g.fill()
  })

  // hover: highlight the window and offer to open it
  if (hot && !active) {
    g.strokeStyle = '#d8b878'; g.lineWidth = 5; rr(g, wx, wy, ww, wh, 16); g.stroke()
    const px = W * 0.5, py = H * 0.8, pw = W * 0.34, ph = H * 0.085
    g.fillStyle = '#d8b878'; rr(g, px - pw / 2, py - ph / 2, pw, ph, ph / 2); g.fill()
    g.fillStyle = '#0b0c0e'; g.textAlign = 'center'; g.font = `600 ${H * 0.04}px "Geist", system-ui, sans-serif`
    g.fillText('Open the website  →', px, py + 2)
  }
  if (active) { g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(0, 0, W, H) }
}

function Monitor({ active, position }: { active: boolean; position: [number, number, number] }) {
  const nav = useNavigate()
  const invalidate = useThree((s) => s.invalidate)
  const [hot, setHot] = useState(false)

  // the screen is a canvas showing a little desktop; hovering it highlights the portfolio window and offers to open it
  const { canvas, tex } = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024; canvas.height = 512
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    return { canvas, tex }
  }, [])
  useEffect(() => {
    drawDesktop(canvas.getContext('2d')!, canvas.width, canvas.height, hot, active)
    tex.needsUpdate = true
    invalidate()
  }, [hot, active, canvas, tex, invalidate])

  return (
    <Fitted url={M.monitor} target={{ w: 1.5 }} position={position}>
      {() => (
        // glowing screen laid over the model's black glass; also the click target
        <mesh
          position={[0, 0.676, 0.1415]}
          onPointerOver={(e) => { e.stopPropagation(); setHot(true); document.body.style.cursor = 'pointer' }}
          onPointerOut={() => { setHot(false); document.body.style.cursor = '' }}
          onClick={(e) => { e.stopPropagation(); if (e.delta > 6) return; nav('/site') }}
        >
          <planeGeometry args={[1.438, 0.714]} />
          <meshBasicMaterial map={tex} toneMapped={false} />
        </mesh>
      )}
    </Fitted>
  )
}

/** Lights, window sky and sun/moon, all driven by the current time in India. */
function Daylight({ windowMat }: { windowMat: THREE.MeshBasicMaterial }) {
  const invalidate = useThree((s) => s.invalidate)
  const scene = useThree((s) => s.scene)
  const frameloop = useThree((s) => s.frameloop)
  const amb = useRef<THREE.AmbientLight>(null)
  const win = useRef<THREE.PointLight>(null)
  const lamp = useRef<THREE.PointLight>(null)
  const orb = useRef<THREE.Mesh>(null)
  const orbMat = useRef<THREE.MeshBasicMaterial>(null)
  const last = useRef(0)

  const apply = () => {
    const st = skyAt(istNow().hours)
    if (amb.current) { amb.current.color.copy(st.ambient); amb.current.intensity = st.ambientIntensity }
    if (win.current) { win.current.color.copy(st.windowLight); win.current.intensity = st.windowIntensity }
    if (lamp.current) lamp.current.intensity = st.lampIntensity
    windowMat.color.copy(st.sky)
    if (scene.background instanceof THREE.Color) scene.background.copy(st.bg)
    if (scene.fog) scene.fog.color.copy(st.bg)
    if (orb.current && orbMat.current) {
      const t = st.sun.t
      orb.current.position.set(-4.8, 2.4 + 1.45 * Math.sin(Math.PI * Math.min(1, Math.max(0, t))), 2.65 - t * 2.7)
      orbMat.current.color.set(st.sun.moon ? '#e6ecff' : '#fff3c4')
    }
  }

  useEffect(() => {
    apply()
    invalidate()
    if (frameloop !== 'demand') return
    const id = window.setInterval(() => { apply(); invalidate() }, 30000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameloop])
  useFrame(() => {
    const now = performance.now()
    if (now - last.current < 1000) return
    last.current = now
    apply()
  })

  return (
    <>
      <ambientLight ref={amb} intensity={1.1} color="#8b93a6" />
      {/* light through the window on the left wall: cool at night, warm at dawn and dusk, bright by day */}
      <pointLight ref={win} position={[-4.2, 3.2, 1.4]} intensity={14} distance={11} color="#8fb0ff" decay={2} />
      <pointLight ref={lamp} position={[1.9, 1.7, 0.4]} intensity={9} distance={7} color="#ffb36b" decay={2} />
      <mesh ref={orb} rotation={[0, Math.PI / 2, 0]} position={[-4.8, 3, 1.3]}>
        <circleGeometry args={[0.17, 28]} />
        <meshBasicMaterial ref={orbMat} color="#fff3c4" />
      </mesh>
    </>
  )
}

const DEFAULT_ZOOM = -0.8 // launch about 16% closer than the base home framing
// when the toy box opens, the camera swings round to show what came out
const TOYS_VIEW = { pos: new THREE.Vector3(-1.0, 1.3, 5.3), look: new THREE.Vector3(-3.4, 0.4, 2.8) }

function Scene({ drift, activeSlug, view }: { drift: boolean; activeSlug?: string; view: RoomView }) {
  const invalidate = useThree((s) => s.invalidate)
  const tableGltf = useGLTF(M.table)

  // desk-top height and monitor-screen height come from the loaded models
  const deskTop = useMemo(() => fitObject(tableGltf.scene.clone(true), { w: 3.4 }).dims.h, [tableGltf])
  const views = useMemo(() => {
    const mx = 0.3, mz = -0.2, sy = deskTop + 0.676, sx = SHELF_X[0]
    return {
      home: { pos: new THREE.Vector3(0.4, 1.7, 5.4), look: new THREE.Vector3(-0.9, 1.3, 0) },
      monitor: { pos: new THREE.Vector3(mx, sy, mz + 0.146 + 1.0), look: new THREE.Vector3(mx, sy, mz + 0.14) },
      shelf: { pos: new THREE.Vector3(sx + 1.75, 1.95, 3.0), look: new THREE.Vector3(sx + 0.05, 1.85, -1.05) },
    } as Record<RoomView, { pos: THREE.Vector3; look: THREE.Vector3 }>
  }, [deskTop])

  const look = useMemo(() => views.home.look.clone(), [views])
  const toysOpen = useRef(false)
  const gl = useThree((s) => s.gl)
  const orbit = useRef({ yaw: 0, pitch: 0, zoom: DEFAULT_ZOOM })
  const zoomApplied = useRef(DEFAULT_ZOOM)
  const viewRef = useRef(view)
  viewRef.current = view

  // a little freedom on the home view: drag to look around, wheel to move in and out (limited)
  useEffect(() => {
    const el = gl.domElement
    let down: { x: number; y: number } | null = null
    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
    const onDown = (e: PointerEvent) => { if (viewRef.current === 'home') down = { x: e.clientX, y: e.clientY } }
    const onMove = (e: PointerEvent) => {
      if (!down || viewRef.current !== 'home') return
      orbit.current.yaw = clamp(orbit.current.yaw - (e.clientX - down.x) * 0.004, -0.8, 1.0)
      orbit.current.pitch = clamp(orbit.current.pitch + (e.clientY - down.y) * 0.003, -0.12, 0.22)
      down = { x: e.clientX, y: e.clientY }
      invalidate()
    }
    const onUp = () => { down = null }
    const onWheel = (e: WheelEvent) => {
      if (viewRef.current !== 'home') return
      e.preventDefault()
      orbit.current.zoom = clamp(orbit.current.zoom + e.deltaY * 0.0012, -1.3, 0.9)
      invalidate()
    }
    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      el.removeEventListener('wheel', onWheel)
    }
  }, [gl, invalidate])
  useEffect(() => { invalidate() }, [view, activeSlug, invalidate])
  useEffect(() => {
    const reset = () => { toysOpen.current = false; orbit.current.yaw = 0; orbit.current.pitch = 0; orbit.current.zoom = DEFAULT_ZOOM; invalidate() }
    const toys = (e: Event) => {
      toysOpen.current = !!(e as CustomEvent<boolean>).detail
      orbit.current.yaw = 0; orbit.current.pitch = 0; orbit.current.zoom = toysOpen.current ? 0 : DEFAULT_ZOOM
      invalidate()
    }
    window.addEventListener('room:reset', reset)
    window.addEventListener('room:toys', toys)
    return () => { window.removeEventListener('room:reset', reset); window.removeEventListener('room:toys', toys) }
  }, [invalidate])

  useFrame(({ camera, pointer, clock }, dt) => {
    const target = view === 'home' && toysOpen.current ? TOYS_VIEW : views[view]
    const t = clock.elapsedTime
    const calm = view === 'home' ? 0.6 : 0.15
    const dx = drift ? (pointer.x * 0.25 + Math.sin(t * 0.15) * 0.08) * calm : 0
    const dy = drift ? pointer.y * 0.1 * calm : 0
    // orbit offsets apply on the home view and ease back to zero elsewhere
    const o = orbit.current
    if (view !== 'home') { o.yaw = THREE.MathUtils.damp(o.yaw, 0, 4, dt); o.pitch = THREE.MathUtils.damp(o.pitch, 0, 4, dt) }
    zoomApplied.current = THREE.MathUtils.damp(zoomApplied.current, view === 'home' ? o.zoom : 0, 4, dt)
    const off = new THREE.Vector3(target.pos.x + dx, target.pos.y + dy, target.pos.z).sub(target.look)
    off.applyAxisAngle(new THREE.Vector3(0, 1, 0), o.yaw)
    off.applyAxisAngle(new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), off).normalize(), o.pitch)
    off.multiplyScalar(1 + zoomApplied.current * 0.2)
    const goal = target.look.clone().add(off)
    if (drift) {
      const k = 1 - Math.exp(-3.2 * dt)
      camera.position.lerp(goal, k)
      look.lerp(target.look, k)
    } else {
      camera.position.copy(goal)
      look.copy(target.look)
    }
    camera.lookAt(look)
  })

  const windowMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#0e1730' }), [])
  const folders: ReactElement[] = []
  projects.slice(0, SHELF_SLOTS).forEach((_, i) => {
    const { unit, row, col } = slot(i)
    folders.push(
      <Folder key={i} index={i} active={projects[i].slug === activeSlug} anyActive={!!activeSlug}
        position={[SHELF_X[unit] - 0.3 + col * 0.42 + (row % 2) * 0.03, 0.8 + row * 0.82, -1.05]} />,
    )
  })

  return (
    <>
      <color attach="background" args={['#0b0c0e']} />
      <fog attach="fog" args={['#0b0c0e', 7, 14]} />
      <Daylight windowMat={windowMat} />
      <pointLight position={[-2.6, 2.2, 0.9]} intensity={7} distance={6} color="#ffc489" decay={2} />
      <ShelfLight x={SHELF_X[0]} side={1} />
      <pointLight position={[0.3, deskTop + 0.5, 0.9]} intensity={1.4} distance={4} color="#9fb4d6" decay={2} />

      <RoomShell windowMat={windowMat} />

      <Fitted url={M.table} target={{ w: 3.4 }} position={[0.4, 0, 0.1]} />
      <Monitor active={view === 'monitor'} position={[0.3, deskTop, -0.2]} />
      <Fitted url={M.keyboard} target={{ w: 0.75 }} position={[0.3, deskTop, 0.42]} />
      <Cup deskTop={deskTop} />
      {/* under the window, out of the first view: found by looking around */}
      <ToyBox position={[-4.1, 0, 3.05]} />
      <AlarmClock position={[-0.75, deskTop, -0.3]} rotation={[0, 0.2, 0]} />
      <Fitted url={M.lamp} target={{ h: 0.6 }} position={[1.9, deskTop, -0.1]} />

      <ShelfUnit x={SHELF_X[0]} rows={3} />
      {folders}
    </>
  )
}

export default function Room({ reducedMotion, activeSlug, view, paused }: {
  reducedMotion: boolean; activeSlug?: string; view: RoomView; paused?: boolean
}) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0.4, 1.7, 5.4], fov: 46 }}
      frameloop={paused ? 'never' : reducedMotion ? 'demand' : 'always'}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      aria-hidden
    >
      <Suspense fallback={null}>
        <Scene drift={!reducedMotion} activeSlug={activeSlug} view={view} />
      </Suspense>
    </Canvas>
  )
}
