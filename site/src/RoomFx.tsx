import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useLocation } from 'react-router-dom'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { fx } from './fxState'
import { partyTracks } from './content'
import { lofi } from './lofi'
import { sfx } from './sfx'
import { found } from './eggs'

const BALL_URL = '/models/disco_ball.glb'
const CEILING = 5 // the cord goes up to here
useGLTF.preload(BALL_URL)

/** The mirror ball, hung on a cord. The tiles pick up the colour of the party. */
function DiscoBall() {
  const gltf = useGLTF(BALL_URL)
  const group = useRef<THREE.Group>(null)
  const scene = useMemo(() => gltf.scene.clone(true), [gltf])
  const tint = useMemo(() => {
    const list: THREE.MeshStandardMaterial[] = []
    scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const mat = m.material as THREE.MeshStandardMaterial
      // no reflections in this room, so the metal would be black: make it less metallic and let the tiles glow
      mat.metalness = 0.25; mat.roughness = 0.35
      mat.emissiveMap = mat.map; mat.emissiveIntensity = 0.9
      list.push(mat)
    })
    return list
  }, [scene])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const p = fx.pulse
    tint.forEach((m) => { paletteAt(t * 0.04, m.emissive); m.emissiveIntensity = 0.7 + 0.9 * p })
    if (group.current) { group.current.rotation.y = t * 0.4; group.current.scale.setScalar(1.5 * (1 + 0.08 * p)) }
  })
  // native ball is 0.31 across; scale it up, and hang it high on a thin cord
  const S = 1.5, Y = 2.95
  return (
    <>
      <mesh position={[0.3, (Y + 0.23 + CEILING) / 2, 0.4]}><cylinderGeometry args={[0.008, 0.008, CEILING - Y - 0.23, 6]} /><meshBasicMaterial color="#6a6a72" /></mesh>
      <group ref={group} position={[0.3, Y, 0.4]} scale={S}><primitive object={scene} /></group>
    </>
  )
}

/** The party palette: dull blue, red and yellow, drifting slowly from one to the next (no rainbow). */
const PALETTE = [new THREE.Color('hsl(220, 48%, 40%)'), new THREE.Color('hsl(2, 58%, 38%)'), new THREE.Color('hsl(42, 70%, 44%)')]
const paletteAt = (phase: number, out: THREE.Color) => {
  const n = PALETTE.length
  const x = ((phase % n) + n) % n
  const i = Math.floor(x), f = x - i
  const e = f * f * (3 - 2 * f) // eases in and out, so changes feel slow
  return out.copy(PALETTE[i]).lerp(PALETTE[(i + 1) % n], e)
}

const PARTY_MS = 15000
const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']

/**
 * Idle flicker for the lamp, and disco mode (Konami code). Both are skipped when motion is reduced.
 * Disco lasts about 25 seconds, or until the code is typed again.
 */
export default function RoomFx({ motion }: { motion: boolean }) {
  const invalidate = useThree((s) => s.invalidate)
  const [disco, setDisco] = useState(false)
  const { pathname } = useLocation()
  const stopRef = useRef<() => void>(() => {})
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const flash = useRef<THREE.AmbientLight>(null)
  const baseFov = useRef(0)
  const partyStart = useRef(0)
  const lights = useRef<(THREE.PointLight | null)[]>([])
  const active = useRef(performance.now())
  const flickerAt = useRef(0)
  const flickerUntil = useRef(0)

  useEffect(() => { lofi.setTracks(partyTracks) }, [])
  useEffect(() => {
    fx.wake = invalidate
    return () => { fx.wake = null }
  }, [invalidate])

  useEffect(() => {
    if (!motion) return
    let seq: string[] = []
    let timer = 0
    let wasPlaying = false
    const announce = (on: boolean) => window.dispatchEvent(new CustomEvent('room:party', { detail: on }))
    const stop = () => {
      fx.disco = false; setDisco(false); clearTimeout(timer)
      lofi.setParty(false)
      if (!wasPlaying) lofi.stop()
      announce(false); invalidate()
    }
    const poke = () => { active.current = performance.now() }
    const onKey = (e: KeyboardEvent) => {
      poke()
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      seq = [...seq, e.key.length === 1 ? e.key.toLowerCase() : e.key].slice(-KONAMI.length)
      if (seq.join() === KONAMI.join()) {
        seq = []
        if (fx.disco) return stop()
        fx.disco = true
        setDisco(true)
        wasPlaying = lofi.playing
        lofi.setParty(true)
        lofi.start(0.6) // a keypress counts as a click, so the browser lets the sound start
        announce(true)
        sfx.play('riser')
        found('party')
        // party lasts 15 seconds, then it ends by itself, no matter what
        timer = window.setTimeout(stop, PARTY_MS)
      }
    }
    stopRef.current = stop
    window.addEventListener('keydown', onKey)
    for (const ev of ['pointermove', 'pointerdown', 'wheel']) window.addEventListener(ev, poke, { passive: true })
    return () => {
      window.removeEventListener('keydown', onKey)
      for (const ev of ['pointermove', 'pointerdown', 'wheel']) window.removeEventListener(ev, poke)
      clearTimeout(timer)
      if (fx.disco) { lofi.setParty(false); if (!wasPlaying) lofi.stop(); announce(false) }
      fx.disco = false
    }
  }, [motion, invalidate])

  // the party ends the moment someone opens something: a monitor icon, the website, a binder on the shelf
  useEffect(() => { if (pathname !== '/' && fx.disco) stopRef.current() }, [pathname])

  useFrame(({ clock }) => {
    const now = performance.now()
    if (motion && !fx.disco && fx.effective > 1 && now - active.current > 30000) {
      // nobody has touched anything for a while: the lamp flickers now and then
      if (flickerAt.current === 0) flickerAt.current = now + 1500
      if (now > flickerAt.current && now > flickerUntil.current) {
        flickerUntil.current = now + 700
        found('flicker')
        flickerAt.current = now + 14000 + Math.random() * 10000
      }
    } else flickerAt.current = 0
    fx.flick = now < flickerUntil.current ? (Math.random() < 0.5 ? 0.12 : 0.35 + Math.random() * 0.65) : 1

    if (disco) {
      const t = clock.elapsedTime
      // one hit at the very start, then slow and calm
      if (!partyStart.current) partyStart.current = performance.now()
      const p = Math.exp(-((performance.now() - partyStart.current) / 1000) * 2.2)
      fx.pulse = p
      lights.current.forEach((l, i) => {
        if (!l) return
        const a = t * 0.3 + (i * Math.PI * 2) / 5
        l.position.set(0.3 + Math.cos(a) * 2.2, 1.5 + Math.sin(t * 0.5 + i) * 0.35, 0.4 + Math.sin(a) * 1.7)
        paletteAt(t * 0.035 + i * 0.6, l.color)
        l.intensity = 11 + 35 * p
      })
      if (flash.current) { paletteAt(t * 0.035 + 0.3, flash.current.color); flash.current.intensity = 0.7 * p * p }
      // the picture punches in a touch on every kick
      if (!baseFov.current) baseFov.current = camera.fov
      camera.fov = baseFov.current * (1 - 0.03 * p)
      camera.updateProjectionMatrix()
    } else if (partyStart.current || baseFov.current) {
      partyStart.current = 0; fx.pulse = 0
      if (baseFov.current) { camera.fov = baseFov.current; camera.updateProjectionMatrix(); baseFov.current = 0 }
    }
  })

  if (!disco) return null
  return (
    <>
      <ambientLight ref={flash} intensity={0} />
      {[0, 1, 2, 3, 4].map((i) => (
        <pointLight key={i} ref={(l) => { lights.current[i] = l }} intensity={22} distance={10} decay={2} />
      ))}
      <Suspense fallback={null}><DiscoBall /></Suspense>
    </>
  )
}
