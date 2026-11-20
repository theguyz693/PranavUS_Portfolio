import { useSyncExternalStore } from 'react'
import { lofi } from './lofi'

/**
 * A simulated radio tuner. Browsers cannot receive FM, so the dial is a picture: stations come from the public
 * radio-browser.info directory (Bangalore and Karnataka stations first, then other Indian ones, all with secure streams), each placed on the dial. Between stations
 * you hear static; near one, the static fades and the live stream comes in.
 */
export type Station = { name: string; url: string; pos: number }
export type RadioState = {
  on: boolean
  status: 'idle' | 'loading' | 'ready' | 'error'
  stations: Station[]
  pos: number // dial position 0..1
  locked: Station | null
  buffering: boolean
}

const SERVERS = ['https://de1.api.radio-browser.info', 'https://de2.api.radio-browser.info', 'https://fi1.api.radio-browser.info', 'https://nl1.api.radio-browser.info']
/** Bangalore's FM stations and where they sit on the dial (MHz, from memory, so treat as approximate). */
const BLR: { re: RegExp; f: number }[] = [
  { re: /^radio\s*city/i, f: 91.1 }, { re: /indigo/i, f: 91.9 }, { re: /^big\s*fm|92\.7 big/i, f: 92.7 }, { re: /^red\s*fm/i, f: 93.5 },
  { re: /radio\s*one/i, f: 94.3 }, { re: /mirchi/i, f: 98.3 }, { re: /rainbow/i, f: 101.3 }, { re: /vividh/i, f: 102.9 }, { re: /^fever 104/i, f: 104.0 },
]
const OTHER = /hyderabad|mumbai|delhi|chennai|kolkata|pune|lucknow|jaipur|punjab|gujarat|kerala|tamil|telugu|assam|goa|panaji|konkani|vancouver|canada|usa|london|dubai|jazz|neighbourhood/i
const BRANDS = /^(radio city|radio mirchi|mirchi|red fm|big fm|fever 104|radio one)/i
const VOLUME = 0.015 // a feeble sound on purpose: it works, but it is only a whisper
const LOCK = 0.018 // how close to a station the dial must be to pick it up
export const DIAL_MIN = 88, DIAL_MAX = 108 // the scale shown on the dial, in MHz
export const freqAt = (pos: number) => DIAL_MIN + pos * (DIAL_MAX - DIAL_MIN)

class RadioEngine {
  private s: RadioState = { on: false, status: 'idle', stations: [], pos: 0.5, locked: null, buffering: false }
  private listeners = new Set<() => void>()
  private ctx: AudioContext | null = null
  private noise: GainNode | null = null
  private audio: HTMLAudioElement | null = null

  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn) } }
  getState = () => this.s
  private set(p: Partial<RadioState>) { this.s = { ...this.s, ...p }; this.listeners.forEach((f) => f()) }

  private ensureNoise() {
    if (this.ctx) return
    const ctx = new AudioContext()
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2200; bp.Q.value = 0.5
    const g = ctx.createGain(); g.gain.value = 0
    src.connect(bp); bp.connect(g); g.connect(ctx.destination)
    src.start()
    this.ctx = ctx; this.noise = g
  }

  private async load() {
    this.set({ status: 'loading' })
    type Raw = { name: string; url_resolved: string; codec: string; lastcheckok: number; state?: string }
    const base0 = '/json/stations/search?countrycode=IN&hidebroken=true&is_https=true&order=votes&reverse=true'
    const NAMES = ['bangalore', 'bengaluru', 'radio city', 'mirchi', 'red fm', 'big fm', 'fever', 'vividh bharati', 'all india radio', 'radio one', 'indigo', 'rainbow']
    const queries = [`${base0}&state=Karnataka&limit=50`, ...NAMES.map((n) => `${base0}&name=${encodeURIComponent(n)}&limit=8`), `${base0}&limit=60`] // the last one: popular stations from all over India, to fill the dial
    for (const base of SERVERS) {
      try {
        const ctl = new AbortController()
        const t = window.setTimeout(() => ctl.abort(), 8000)
        const results = await Promise.all(queries.map((q) => fetch(base + q, { signal: ctl.signal }).then((r) => (r.ok ? (r.json() as Promise<Raw[]>) : [])).catch(() => [] as Raw[])))
        clearTimeout(t)
        const raw = results.slice(0, -1).flat()
        const extra = results[results.length - 1]
        const seen = new Set<string>()
        const usedKeys = new Set<string>()
        // Bangalore's FM band, by station (approximate): the dial puts each where it sits on the city's real dial
        const picks: { r: Raw; freq: number | null }[] = []
        for (const r of raw) {
          const key = r.name.trim().toLowerCase()
          if (!r.url_resolved?.startsWith('https://') || r.lastcheckok !== 1 || key.length < 3 || seen.has(key) || !/mp3|aac/i.test(r.codec)) continue
          // only Bangalore and Karnataka stations (or the big city brands), not stations named for somewhere else
          const blrWord = /bangalore|bengaluru|karnataka|kannada/i.test(r.name)
          if (OTHER.test(r.name) && !blrWord) continue
          if (!(blrWord || /karnataka/i.test(r.state ?? '') || BRANDS.test(r.name.trim()))) continue
          seen.add(key)
          const known = BLR.find((b) => b.re.test(r.name))
          if (known) { if (usedKeys.has(known.f.toString())) continue; usedKeys.add(known.f.toString()) }
          const m = r.name.match(/\b(8[89]|9\d|10[0-8])\.\d\b/)
          picks.push({ r, freq: known ? known.f : m ? parseFloat(m[0]) : null })
        }
        // Bangalore stations first, then the rest of Karnataka, capped
        picks.sort((a, b) => Number(b.freq !== null) - Number(a.freq !== null))
        // not enough Bangalore stations with a working stream: fill the rest of the dial with popular Indian ones
        for (const r of extra) {
          if (picks.length >= 12) break
          const key = r.name.trim().toLowerCase()
          if (!r.url_resolved?.startsWith('https://') || r.lastcheckok !== 1 || key.length < 3 || seen.has(key) || !/mp3|aac/i.test(r.codec) || OTHER.test(r.name)) continue
          seen.add(key)
          picks.push({ r, freq: null })
        }
        const list = picks.slice(0, 14)
        if (!list.length) continue
        const taken: number[] = []
        const stations: Station[] = list.map(({ r, freq }) => {
          let pos = freq !== null ? (freq - DIAL_MIN) / (DIAL_MAX - DIAL_MIN) : -1
          if (pos >= 0 && taken.some((x) => Math.abs(x - pos) < 0.04)) pos = -1
          if (pos >= 0) taken.push(pos)
          return { name: r.name.trim(), url: r.url_resolved, pos }
        })
        const free = stations.filter((st) => st.pos < 0)
        free.forEach((st, i) => {
          let p = 0.04 + (i / Math.max(1, free.length - 1)) * 0.92
          while (taken.some((x) => Math.abs(x - p) < 0.04)) p += 0.045
          st.pos = Math.min(0.97, p); taken.push(st.pos)
        })
        stations.sort((a, b) => a.pos - b.pos)
        this.set({ status: 'ready', stations })
        return
      } catch { /* try the next server */ }
    }
    this.set({ status: 'error' })
  }

  async power(on: boolean) {
    if (on === this.s.on) return
    if (!on) {
      this.unlock()
      this.noise?.gain.setTargetAtTime(0, this.ctx!.currentTime, 0.08)
      this.set({ on: false })
      lofi.duck(false)
      return
    }
    this.ensureNoise()
    if (this.ctx!.state === 'suspended') await this.ctx!.resume()
    this.set({ on: true })
    lofi.duck(true) // the background music steps aside while the radio is on
    this.apply()
    if (this.s.status === 'idle' || this.s.status === 'error') await this.load()
    this.tune(this.s.pos)
  }

  private apply() {
    if (!this.ctx || !this.noise) return
    const level = this.s.on ? (this.s.locked ? 0.0016 : 0.0096) : 0
    this.noise.gain.setTargetAtTime(level, this.ctx.currentTime, 0.06)
  }

  private unlock() {
    const a = this.audio
    if (a) { a.pause(); a.removeAttribute('src'); a.load() }
    this.audio = null
    if (this.s.locked) this.set({ locked: null, buffering: false })
  }

  private lock(st: Station) {
    this.unlock()
    const a = new Audio()
    a.src = st.url
    a.volume = VOLUME
    this.audio = a
    this.set({ locked: st, buffering: true })
    a.addEventListener('playing', () => { if (this.audio === a) { this.set({ buffering: false }); this.apply() } })
    a.addEventListener('error', () => this.bad(st))
    a.play().catch(() => { if (this.audio === a) this.bad(st) })
    this.apply()
  }

  /** A station that does not play is dropped from the dial. */
  private bad(st: Station) {
    if (this.s.locked !== st) return
    this.audio = null
    this.set({ locked: null, buffering: false, stations: this.s.stations.filter((x) => x !== st) })
    this.apply()
  }

  tune(pos: number) {
    const p = Math.min(1, Math.max(0, pos))
    this.set({ pos: p })
    if (!this.s.on || !this.s.stations.length) return
    let best = this.s.stations[0]
    for (const s of this.s.stations) if (Math.abs(s.pos - p) < Math.abs(best.pos - p)) best = s
    const dist = Math.abs(best.pos - p)
    if (dist < LOCK) {
      if (this.s.locked !== best) this.lock(best)
      else if (this.audio) this.audio.volume = VOLUME * (1 - 0.5 * (dist / LOCK)) // fades a little off the centre
    } else if (this.s.locked) { this.unlock(); this.apply() }
  }

  /** Jump to the next station up the dial, wrapping round. */
  next(dir: 1 | -1 = 1) {
    const list = this.s.stations
    if (!list.length) return
    const here = this.s.pos
    const ahead = dir === 1 ? list.find((s) => s.pos > here + LOCK * 1.2) : [...list].reverse().find((s) => s.pos < here - LOCK * 1.2)
    const target = ahead ?? (dir === 1 ? list[0] : list[list.length - 1])
    this.tune(target.pos)
  }
}

export const radio = new RadioEngine()
export const useRadio = () => useSyncExternalStore(radio.subscribe, radio.getState)
if (import.meta.env.DEV) (window as unknown as { __radio: RadioEngine }).__radio = radio
