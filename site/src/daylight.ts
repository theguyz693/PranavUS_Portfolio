import * as THREE from 'three'

/** Current time in India (IST), as decimal hours plus parts. `?hour=14.5` in the URL overrides it for testing. */
export function istNow() {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date())
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0) % 24
  let h = get('hour'), m = get('minute'), s = get('second')
  const override = new URLSearchParams(location.search).get('hour')
  if (override !== null && !Number.isNaN(Number(override))) {
    const o = ((Number(override) % 24) + 24) % 24
    h = Math.floor(o); m = Math.floor((o - h) * 60); s = Math.floor((((o - h) * 60) - m) * 60)
  }
  return { h, m, s, hours: h + m / 60 + s / 3600 }
}

const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
const C = (hex: string) => new THREE.Color(hex)

export interface SkyState {
  day: number // 0 night .. 1 full day
  warm: number // 0..1 around sunrise and sunset
  sky: THREE.Color
  windowLight: THREE.Color
  windowIntensity: number
  ambient: THREE.Color
  ambientIntensity: number
  lampIntensity: number
  bg: THREE.Color
  sun: { visible: boolean; moon: boolean; t: number } // t 0..1 across the window
}

const NIGHT_SKY = C('#0e1730'), DAY_SKY = C('#b5d3f5'), WARM_SKY = C('#e58a52')
const NIGHT_LIGHT = C('#8fb0ff'), DAY_LIGHT = C('#fff0d8'), WARM_LIGHT = C('#ffb27a')

/** Sunrise about 06:00, sunset about 18:30 (India). */
export function skyAt(hours: number): SkyState {
  const day = smooth(5.5, 7.0, hours) * (1 - smooth(17.75, 19.25, hours))
  const warm = Math.max(0, 1 - Math.abs(hours - 6.25) / 1.1) + Math.max(0, 1 - Math.abs(hours - 18.5) / 1.1)
  const w = Math.min(1, warm)
  const sky = NIGHT_SKY.clone().lerp(DAY_SKY, day).lerp(WARM_SKY, w * 0.55)
  const windowLight = NIGHT_LIGHT.clone().lerp(DAY_LIGHT, day).lerp(WARM_LIGHT, w * 0.6)
  const daySpan = (hours - 6) / 12.5 // sun travels 06:00 to 18:30
  const nightH = hours >= 18.5 ? hours - 18.5 : hours + 5.5
  const nightSpan = nightH / 11.5 // moon travels 18:30 to 06:00
  const isDay = hours >= 6 && hours < 18.5
  return {
    day, warm: w, sky, windowLight,
    windowIntensity: 10 + 24 * day,
    ambient: C('#7f88a8').lerp(C('#c8d0e0'), day),
    ambientIntensity: 0.8 + 0.7 * day,
    lampIntensity: 9 - 7 * day,
    bg: C('#0b0c0e').lerp(C('#161920'), day),
    sun: { visible: true, moon: !isDay, t: isDay ? daySpan : nightSpan },
  }
}
