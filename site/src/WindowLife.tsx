import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { istNow, skyAt } from './daylight'

// The window is on the left wall; the sun and moon already cross it between about z 2.65 and z -0.05.
const X = -4.82
const Z0 = 2.95, Z1 = -0.35

function softTexture(kind: 'cloud' | 'puff') {
  const c = document.createElement('canvas')
  c.width = kind === 'cloud' ? 256 : 64; c.height = kind === 'cloud' ? 128 : 64
  const g = c.getContext('2d')!
  const blobs = kind === 'cloud'
    ? [[70, 78, 56], [120, 62, 66], [170, 76, 54], [100, 86, 48], [150, 88, 44]]
    : [[32, 32, 28]]
  for (const [x, y, r] of blobs) {
    const rg = g.createRadialGradient(x, y, 0, x, y, r)
    rg.addColorStop(0, 'rgba(255,255,255,0.9)'); rg.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = rg; g.fillRect(0, 0, c.width, c.height)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** A little life outside the window: clouds, now and then rain, and a bird that crosses once in a while. */
export default function WindowLife({ motion }: { motion: boolean }) {
  const cloudTex = useMemo(() => softTexture('cloud'), [])
  const rainy = useMemo(() => Math.random() < 0.25, []) // a rainy day, one in four
  const clouds = useRef<(THREE.Mesh | null)[]>([])
  const cloudMats = useRef<(THREE.MeshBasicMaterial | null)[]>([])
  const bird = useRef<THREE.Group>(null)
  const wings = useRef<(THREE.Mesh | null)[]>([])
  const rain = useRef<THREE.LineSegments>(null)
  const state = useRef({ day: 1, last: 0, nextBird: performance.now() + 25000 + Math.random() * 30000, birdAt: 0 })

  const CLOUDS = useMemo(() => [
    { y: 3.55, z: 2.4, s: 1.5, v: 0.05 }, { y: 3.1, z: 0.9, s: 1.15, v: 0.075 }, { y: 3.75, z: -0.1, s: 1.3, v: 0.04 }, { y: 2.8, z: 2.9, s: 1.0, v: 0.06 },
  ], [])
  const rainGeo = useMemo(() => {
    const n = 90
    const pos = new Float32Array(n * 6)
    for (let i = 0; i < n; i++) {
      const z = Z1 + Math.random() * (Z0 - Z1), y = 2.0 + Math.random() * 2.2
      pos.set([X + 0.02, y, z, X + 0.02, y - 0.13, z], i * 6)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return g
  }, [])
  const wingGeo = useMemo(() => {
    const sh = new THREE.Shape()
    sh.moveTo(0, 0); sh.lineTo(0.18, 0.05); sh.lineTo(0.02, -0.03); sh.closePath()
    return new THREE.ShapeGeometry(sh)
  }, [])

  useFrame((_, dt) => {
    const s = state.current
    const now = performance.now()
    if (now - s.last > 1000) { s.last = now; s.day = skyAt(istNow().hours).day }
    const day = s.day
    const dim = rainy ? 0.55 : 1

    CLOUDS.forEach((c, i) => {
      const m = clouds.current[i], mat = cloudMats.current[i]
      if (!m || !mat) return
      if (motion) { c.z -= dt * c.v; if (c.z < Z1 - 0.6) c.z = Z0 + 0.6 }
      m.position.set(X, c.y, c.z)
      mat.opacity = (0.1 + 0.5 * day) * (rainy ? 1.3 : 1)
      mat.color.setRGB((0.55 + 0.45 * day) * dim, (0.6 + 0.4 * day) * dim, (0.75 + 0.25 * day) * dim)
    })

    if (rain.current) {
      rain.current.visible = rainy && motion
      if (rainy && motion) {
        const a = rain.current.geometry.attributes.position as THREE.BufferAttribute
        for (let i = 0; i < a.count; i += 2) {
          const drop = dt * 3.2
          let y = a.getY(i) - drop
          if (y < 2.0) y = 4.2 + Math.random() * 0.3
          a.setY(i, y); a.setY(i + 1, y - 0.13)
        }
        a.needsUpdate = true
      }
    }

    // the bird: by day only, about once a minute, across the window in four seconds
    const b = bird.current
    if (b) {
      if (motion && !s.birdAt && now > s.nextBird && day > 0.6 && !rainy) s.birdAt = now
      if (s.birdAt) {
        const u = (now - s.birdAt) / 4200
        if (u >= 1) { s.birdAt = 0; s.nextBird = now + 40000 + Math.random() * 40000; b.visible = false }
        else {
          b.visible = true
          b.position.set(X + 0.01, 3.25 + Math.sin(u * 7) * 0.12 - u * 0.15, Z0 + (Z1 - Z0) * u)
          const flap = Math.sin(now / 55) * 0.8
          wings.current[0] && (wings.current[0]!.rotation.x = flap)
          wings.current[1] && (wings.current[1]!.rotation.x = -flap)
        }
      } else b.visible = false
    }
  })

  return (
    <>
      {CLOUDS.map((c, i) => (
        <mesh key={i} ref={(m) => { clouds.current[i] = m }} rotation={[0, Math.PI / 2, 0]} scale={[c.s, c.s * 0.5, 1]}>
          <planeGeometry args={[1.6, 1.6]} />
          <meshBasicMaterial ref={(m) => { cloudMats.current[i] = m }} map={cloudTex} transparent depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
      <lineSegments ref={rain} geometry={rainGeo} visible={false}>
        <lineBasicMaterial color="#9db4d8" transparent opacity={0.5} toneMapped={false} />
      </lineSegments>
      <group ref={bird} visible={false} rotation={[0, Math.PI / 2, 0]}>
        {[1, -1].map((side, i) => (
          <mesh key={side} ref={(m) => { wings.current[i] = m }} geometry={wingGeo} scale={[side, 1, 1]}>
            <meshBasicMaterial color="#0a0a0c" side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </>
  )
}

/** A soft wisp of steam rising from the mug. */
export function Steam({ motion, at }: { motion: boolean; at: { current: number } }) {
  const N = 16
  const ref = useRef<THREE.Points>(null)
  const tex = useMemo(() => softTexture('puff'), [])
  const { pos, col, life } = useMemo(() => ({
    pos: new Float32Array(N * 3), col: new Float32Array(N * 3), life: Float32Array.from({ length: N }, (_, i) => i / N),
  }), [])
  useFrame((_, dt) => {
    const g = ref.current?.geometry
    if (!g || !motion) return
    // steam only after the mug is clicked: it rises for about two seconds, then fades away
    const age = (performance.now() - at.current) / 1000
    const k = at.current && age < 2.4 ? Math.min(1, Math.max(0, (2.4 - age) / 0.8)) : 0
    ref.current!.visible = k > 0
    if (k === 0) return
    const a = g.attributes.position as THREE.BufferAttribute, c = g.attributes.color as THREE.BufferAttribute
    const t = performance.now() / 1000
    for (let i = 0; i < N; i++) {
      life[i] = (life[i] + dt * 0.28) % 1
      const l = life[i]
      a.setXYZ(i, Math.sin(l * 7 + i * 1.7 + t * 0.6) * 0.03 * l, 0.2 + l * 0.34, Math.cos(l * 5 + i) * 0.02 * l)
      const v = 0.38 * Math.sin(Math.PI * l) * k // fades in and out
      c.setXYZ(i, v, v, v)
    }
    a.needsUpdate = true; c.needsUpdate = true
  })
  return (
    <points ref={ref} visible={false} raycast={() => null}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[pos, 3]} />
        <bufferAttribute attach="attributes-color" args={[col, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.09} map={tex} vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </points>
  )
}
