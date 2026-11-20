/**
 * A small generative lo-fi player: nothing is downloaded, so there is nothing to license.
 * Everything is synthesised live with the Web Audio API. Two moods: the room (warmer, slower)
 * and the website (lighter, a different key and progression).
 */
export type Mood = 'room' | 'site'

type Song = { bpm: number; swing: number; chords: number[][]; bass: number[]; scale: number[]; cutoff: number }

/** Where the party clip starts in each file (seconds), chosen by loudness. Anything not listed starts at 20. */
const TRACK_START: Record<string, number> = { 'party-1.mp3': 133 }

const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12)

// MIDI notes. Chords are jazzy sevenths voiced around middle C.
const SONGS: Record<Mood, Song> = {
  room: {
    bpm: 70, swing: 0.16, cutoff: 1500,
    chords: [[60, 64, 67, 71], [57, 60, 64, 67], [62, 65, 69, 72], [55, 59, 62, 65]], // Cmaj7 Am7 Dm7 G7
    bass: [36, 33, 38, 31],
    scale: [72, 74, 76, 79, 81, 84], // C major pentatonic
  },
  site: {
    bpm: 62, swing: 0.2, cutoff: 2100,
    chords: [[65, 69, 72, 76], [64, 67, 71, 74], [57, 60, 64, 67], [62, 65, 69, 72]], // Fmaj7 Em7 Am7 Dm7
    bass: [41, 40, 33, 38],
    scale: [69, 72, 74, 76, 79, 81], // A minor pentatonic
  },
}

/**
 * Party beats for disco mode: drill and dark, bass-heavy hip-hop (original, not copies of any song).
 * 16 sixteenth-note steps per bar; the arrays list which steps each drum hits.
 */
type PartySong = {
  name: string; bpm: number; swing: number; cutoff: number
  chords: number[][]; bass: number[]; scale: number[]
  kick: number[]; snare: number[]; hat: number[]; triplet: number[]; open: number[]
  keys: 'pad' | 'none'; lead: 'piano' | 'bells'; glide: boolean
}
const PARTY: PartySong[] = [
  { // UK drill: sliding 808s, skippy triplet hats, cold piano
    name: 'uk drill', bpm: 140, swing: 0, cutoff: 2300,
    chords: [[53, 56, 60, 63], [51, 54, 58, 61], [49, 53, 56, 60], [48, 51, 55, 58]], bass: [29, 27, 25, 24], scale: [65, 68, 70, 72, 75, 77],
    kick: [0, 3, 10, 13], snare: [8], hat: [0, 2, 4, 6, 8, 10, 12, 14], triplet: [5, 13], open: [], keys: 'pad', lead: 'piano', glide: true },
  { // NY drill: bells, bounce, hat stutters
    name: 'ny drill', bpm: 144, swing: 0, cutoff: 2600,
    chords: [[50, 53, 57, 60], [46, 50, 53, 57], [48, 52, 55, 59], [45, 48, 52, 55]], bass: [26, 22, 24, 21], scale: [62, 65, 67, 69, 72, 74],
    kick: [0, 6, 11], snare: [8], hat: [0, 2, 4, 6, 8, 10, 12, 14], triplet: [3, 7, 15], open: [14], keys: 'pad', lead: 'bells', glide: true },
  { // dark, slow and heavy hip-hop
    name: 'dark boom', bpm: 84, swing: 0.08, cutoff: 2200,
    chords: [[57, 60, 64, 67], [53, 56, 60, 63], [55, 58, 62, 65], [52, 55, 59, 62]], bass: [21, 17, 19, 16], scale: [69, 72, 74, 76, 79, 81],
    kick: [0, 7, 10], snare: [8], hat: [0, 2, 4, 6, 8, 10, 12, 14], triplet: [], open: [14], keys: 'pad', lead: 'piano', glide: false },
  { // heavy trap: rolling hats, long 808 slides
    name: 'heavy trap', bpm: 134, swing: 0, cutoff: 2500,
    chords: [[48, 51, 55, 58], [44, 48, 51, 55], [46, 50, 53, 57], [43, 47, 50, 54]], bass: [24, 20, 22, 19], scale: [72, 75, 77, 79, 82, 84],
    kick: [0, 3, 6, 10], snare: [8], hat: [0, 2, 4, 6, 8, 10, 12, 14], triplet: [7, 15], open: [6], keys: 'pad', lead: 'bells', glide: true },
]

function noiseBuffer(ctx: AudioContext, seconds: number) {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return buf
}

export class Lofi {
  private ctx: AudioContext | null = null
  private master!: GainNode
  private tone!: BiquadFilterNode
  private noise!: AudioBuffer
  private timer = 0
  private next = 0
  private step = 0
  private mood: Mood = 'room'
  private target = 0.0
  private on = false
  private began = false
  // real tracks for party mode (files in the music folder), analysed so the visuals can follow the bass
  private tracks: string[] = []
  private el: HTMLAudioElement | null = null
  private analyser: AnalyserNode | null = null
  private trackGain: GainNode | null = null
  private trackMode = false
  private bins = new Uint8Array(0)
  private bassAvg = 0
  private prevBass = 0
  private trackKick = -9
  private lastAnalyse = 0
  private fadeTimer = 0
  private vinylGain: GainNode | null = null
  private party: PartySong | null = null
  private lastParty = -1
  private kicks: number[] = []

  private build() {
    const ctx = new AudioContext()
    this.ctx = ctx
    this.master = ctx.createGain()
    this.master.gain.value = 0
    this.tone = ctx.createBiquadFilter()
    this.tone.type = 'lowpass'
    this.tone.frequency.value = SONGS[this.mood].cutoff
    this.tone.Q.value = 0.5

    // a soft echo bus gives it some air
    const delay = ctx.createDelay(1)
    delay.delayTime.value = 0.34
    const fb = ctx.createGain()
    fb.gain.value = 0.32
    const wet = ctx.createGain()
    wet.gain.value = 0.28
    const dl = ctx.createBiquadFilter()
    dl.type = 'lowpass'
    dl.frequency.value = 1400
    delay.connect(dl); dl.connect(fb); fb.connect(delay); dl.connect(wet)

    this.tone.connect(this.master)
    this.tone.connect(delay)
    wet.connect(this.master)
    this.master.connect(ctx.destination)

    this.noise = noiseBuffer(ctx, 2)
    this.vinyl()
  }

  /** Constant faint hiss plus the odd crackle. */
  private vinyl() {
    const ctx = this.ctx!
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    src.loop = true
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'; hp.frequency.value = 4500
    const g = ctx.createGain()
    g.gain.value = 0.012
    src.connect(hp); hp.connect(g); g.connect(this.master)
    this.vinylGain = g
    src.start()
  }

  private pop(t: number) {
    const ctx = this.ctx!
    const s = ctx.createBufferSource()
    s.buffer = this.noise
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.05 + Math.random() * 0.05, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.02)
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'; hp.frequency.value = 2500
    s.connect(hp); hp.connect(g); g.connect(this.master)
    s.start(t, Math.random(), 0.03)
  }

  private note(m: number, t: number, len: number, vol: number, type: OscillatorType = 'triangle') {
    const ctx = this.ctx!
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(vol, t + 0.04)
    g.gain.exponentialRampToValueAtTime(0.0001, t + len)
    g.connect(this.tone)
    for (const detune of [-6, 6]) {
      const o = ctx.createOscillator()
      o.type = type
      o.frequency.value = hz(m)
      o.detune.value = detune
      o.connect(g)
      o.start(t)
      o.stop(t + len + 0.05)
    }
  }

  private kick(t: number) {
    const ctx = this.ctx!
    this.kicks.push(t)
    if (this.kicks.length > 64) this.kicks.shift()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.frequency.setValueAtTime(130, t)
    o.frequency.exponentialRampToValueAtTime(42, t + 0.14)
    g.gain.setValueAtTime(0.5, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28)
    o.connect(g); g.connect(this.master)
    o.start(t); o.stop(t + 0.3)
  }

  private hit(t: number, freq: number, len: number, vol: number, type: BiquadFilterType) {
    const ctx = this.ctx!
    const s = ctx.createBufferSource()
    s.buffer = this.noise
    const f = ctx.createBiquadFilter()
    f.type = type; f.frequency.value = freq
    const g = ctx.createGain()
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + len)
    s.connect(f); f.connect(g); g.connect(this.master)
    s.start(t, Math.random(), len + 0.02)
  }

  /** One 8th-note step. Sixteen steps make a bar pair; chords change every two beats-of-eight. */
  private piano(m: number, t: number, len: number, vol: number) {
    const ctx = this.ctx!
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008)
    g.gain.exponentialRampToValueAtTime(0.0001, t + len)
    g.connect(this.tone)
    for (const [mult, type, level] of [[1, 'triangle', 1], [2, 'sine', 0.35]] as const) {
      const o = ctx.createOscillator(); const lg = ctx.createGain()
      o.type = type; o.frequency.value = hz(m) * mult; lg.gain.value = level
      o.connect(lg); lg.connect(g); o.start(t); o.stop(t + len + 0.05)
    }
  }

  private bell(m: number, t: number, len: number, vol: number) {
    const ctx = this.ctx!
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(vol, t + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, t + len)
    g.connect(this.tone)
    for (const [mult, level] of [[1, 1], [2.76, 0.4], [5.4, 0.15]] as const) {
      const o = ctx.createOscillator(); const lg = ctx.createGain()
      o.type = 'sine'; o.frequency.value = hz(m) * mult; lg.gain.value = level
      o.connect(lg); lg.connect(g); o.start(t); o.stop(t + len + 0.05)
    }
  }

  private pad(m: number, t: number, len: number, vol: number) {
    const ctx = this.ctx!
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(vol, t + len * 0.35)
    g.gain.exponentialRampToValueAtTime(0.0001, t + len)
    g.connect(this.tone)
    for (const d of [-9, 9]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = d
      o.connect(g); o.start(t); o.stop(t + len + 0.05)
    }
  }

  /** A sub-bass 808: a long sine that can slide down to the next pitch. */
  private sub808(m: number, t: number, len: number, vol: number, glideTo?: number) {
    const ctx = this.ctx!
    const o = ctx.createOscillator(); const g = ctx.createGain()
    o.type = 'sine'
    o.frequency.setValueAtTime(hz(m) * 1.8, t)
    o.frequency.exponentialRampToValueAtTime(hz(m), t + 0.05)
    if (glideTo) o.frequency.exponentialRampToValueAtTime(hz(glideTo), t + len)
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + len)
    o.connect(g); g.connect(this.master)
    o.start(t); o.stop(t + len + 0.05)
    // a quiet octave above keeps the bass audible on small speakers
    const h = ctx.createOscillator(); const hg = ctx.createGain()
    h.type = 'triangle'; h.frequency.setValueAtTime(hz(m) * 2, t)
    if (glideTo) h.frequency.exponentialRampToValueAtTime(hz(glideTo) * 2, t + len)
    hg.gain.setValueAtTime(vol * 0.28, t); hg.gain.exponentialRampToValueAtTime(0.0001, t + len * 0.8)
    h.connect(hg); hg.connect(this.tone)
    h.start(t); h.stop(t + len + 0.05)
  }

  private motif: number[] = []
  private schedulePartyStep(song: PartySong, step: number, t: number) {
    const sixteenth = 60 / song.bpm / 4
    const bar = Math.floor(step / 16) % song.chords.length
    const s = step % 16
    const j = () => (Math.random() - 0.5) * 0.008
    const chord = song.chords[bar]
    const barLen = sixteenth * 16

    if (s === 0) {
      if (song.keys === 'pad') chord.forEach((m, i) => this.pad(m, t + i * 0.01, barLen * 1.05, 0.045))
      if (bar === 0 || !this.motif.length) this.motif = Array.from({ length: 4 }, () => song.scale[Math.floor(Math.random() * song.scale.length)])
    }

    // 808s land on the kicks; some slide to another note, like drill basslines do
    if (song.kick.includes(s)) {
      const root = song.bass[bar]
      let glideTo: number | undefined
      if (song.glide) glideTo = s >= 10 ? song.bass[(bar + 1) % song.bass.length] : s === 3 ? root - 2 : undefined
      this.sub808(root, t, sixteenth * (s === 0 ? 7 : 4), 0.5, glideTo)
      this.kick(t)
    }
    if (song.snare.includes(s)) { this.hit(t + j(), 1900, 0.18, 0.24, 'bandpass'); this.hit(t + j(), 5200, 0.1, 0.12, 'highpass') } // snare / clap
    if (song.hat.includes(s)) this.hit(t + j(), 7800, 0.03, 0.05 + (s % 4 === 0 ? 0.03 : 0), 'highpass')
    if (song.triplet.includes(s)) for (let k = 0; k < 3; k++) this.hit(t + (sixteenth * 2 * k) / 3, 8200, 0.025, 0.06 + k * 0.01, 'highpass')
    if (song.open.includes(s)) this.hit(t + j(), 6800, 0.14, 0.06, 'highpass')

    // a cold, sparse melody on top
    if (s % 4 === 0 && (s !== 8 || Math.random() < 0.5)) {
      const m = this.motif[(s / 4) % this.motif.length]
      if (m !== undefined) {
        if (song.lead === 'bells') this.bell(m, t + j(), sixteenth * 7, 0.06)
        else this.piano(m, t + j(), sixteenth * 7, 0.08)
      }
    }
  }

  private schedule(step: number, t: number) {
    if (this.party) return this.schedulePartyStep(this.party, step, t)
    const song = SONGS[this.mood]
    const eighth = 60 / song.bpm / 2
    const bar = Math.floor(step / 8) % song.chords.length
    const s = step % 8
    const human = () => (Math.random() - 0.5) * 0.02

    if (s === 0) {
      song.chords[bar].forEach((m, i) => this.note(m, t + i * 0.025, eighth * 7.5, 0.05))
      this.note(song.bass[bar], t, eighth * 3.2, 0.2, 'sine')
    }
    if (s === 4) this.note(song.bass[bar], t + human(), eighth * 2, 0.14, 'sine')
    if (s === 0 || s === 5) this.kick(t)
    if (s === 2 || s === 6) this.hit(t + human(), 1800, 0.14, 0.16, 'bandpass') // snare
    if (s % 2 === 0) this.hit(t + human(), 7000, 0.04, 0.05 + Math.random() * 0.03, 'highpass') // hat
    // a sparse little melody
    if ((s === 1 || s === 3 || s === 5 || s === 7) && Math.random() < 0.28) {
      const m = song.scale[Math.floor(Math.random() * song.scale.length)]
      this.note(m, t + human(), eighth * 2.6, 0.035, 'sine')
    }
    if (Math.random() < 0.18) this.pop(t + Math.random() * eighth)
  }

  private tick = () => {
    const ctx = this.ctx
    if (!ctx || !this.on) return
    if (this.trackMode) { this.next = ctx.currentTime + 0.2; return }
    while (this.next < ctx.currentTime + 0.35) {
      const song = this.party ?? SONGS[this.mood]
      const unit = this.party ? 60 / song.bpm / 4 : 60 / song.bpm / 2 // party beats step in sixteenths
      // swing: push every off-beat step late
      const swing = this.step % 2 === 1 ? unit * song.swing : 0
      this.schedule(this.step, this.next + swing)
      this.next += unit
      this.step++
    }
  }

  /** Disco mode: a random party beat (never the same twice in a row). Off returns to the lo-fi. */
  setTracks(urls: string[]) { this.tracks = urls }

  private async playTrack(url: string) {
    if (!this.ctx) this.build()
    const ctx = this.ctx!
    if (ctx.state === 'suspended') await ctx.resume()
    if (!this.el) {
      const el = new Audio()
      el.preload = 'auto'; el.loop = true; el.crossOrigin = 'anonymous'
      const src = ctx.createMediaElementSource(el)
      this.analyser = ctx.createAnalyser()
      this.analyser.fftSize = 512; this.analyser.smoothingTimeConstant = 0.4
      this.bins = new Uint8Array(this.analyser.frequencyBinCount)
      this.trackGain = ctx.createGain(); this.trackGain.gain.value = 0
      src.connect(this.analyser); this.analyser.connect(this.trackGain); this.trackGain.connect(ctx.destination)
      this.el = el
    }
    const el = this.el
    clearTimeout(this.fadeTimer)
    const name = url.split('/').pop() ?? ''
    const start = TRACK_START[name] ?? 20 // the part of the song worth hearing, in seconds
    el.src = url
    this.trackMode = true
    this.master.gain.setTargetAtTime(0, ctx.currentTime, 0.1) // the synthesised music steps aside
    el.addEventListener('loadedmetadata', () => { el.currentTime = Math.min(start, Math.max(0, (el.duration || start) - 20)) }, { once: true })
    await el.play().catch(() => {})
    this.trackGain!.gain.cancelScheduledValues(ctx.currentTime)
    this.trackGain!.gain.setTargetAtTime(0.3, ctx.currentTime, 0.4) // audible, but low
  }

  private stopTrack() {
    if (!this.trackMode || !this.ctx || !this.el) return
    this.trackMode = false
    const el = this.el
    this.trackGain?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2)
    this.fadeTimer = window.setTimeout(() => { if (!this.trackMode) el.pause() }, 900)
    if (this.on) this.master.gain.setTargetAtTime(this.target, this.ctx.currentTime, 0.6)
  }

  setParty(on: boolean) {
    if (!on) this.stopTrack()
    else if (this.tracks.length) {
      if (this.ctx && this.vinylGain) this.vinylGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2)
      this.party = null
      void this.playTrack(this.tracks[Math.floor(Math.random() * this.tracks.length)])
      return
    }
    if (this.ctx && this.vinylGain) this.vinylGain.gain.setTargetAtTime(on ? 0 : 0.012, this.ctx.currentTime, 0.2) // no lo-fi crackle in the party
    if (!on) {
      this.party = null
      if (this.ctx) this.tone.frequency.setTargetAtTime(SONGS[this.mood].cutoff, this.ctx.currentTime, 0.3)
      return
    }
    let i = Math.floor(Math.random() * PARTY.length)
    if (i === this.lastParty) i = (i + 1) % PARTY.length
    this.lastParty = i
    this.party = PARTY[i]
    this.step = 0
    if (this.ctx) {
      this.next = this.ctx.currentTime + 0.1
      this.tone.frequency.setTargetAtTime(this.party.cutoff, this.ctx.currentTime, 0.2)
    }
  }
  get partyName() { return this.party?.name ?? null }

  /** 1 on a kick drum, fading to 0 in a fraction of a second: lets the visuals move with the beat. */
  pulse() {
    const ctx = this.ctx
    if (this.trackMode && this.analyser) {
      const nowMs = performance.now()
      if (nowMs - this.lastAnalyse > 12) { // the bass hits of the song, found once per frame
        this.lastAnalyse = nowMs
        this.analyser.getByteFrequencyData(this.bins)
        const e = (this.bins[0] + this.bins[1]) / 2 / 255
        this.bassAvg += (e - this.bassAvg) * 0.03
        // a sudden rise in the bass counts as a hit (this ignores a bass note that simply rings on)
        if (e - this.prevBass > 0.06 && e > this.bassAvg && nowMs / 1000 - this.trackKick > 0.25) this.trackKick = nowMs / 1000
        this.prevBass = e
      }
      return Math.exp(-(nowMs / 1000 - this.trackKick) * 6)
    }
    if (!ctx || !this.on) return 0
    const now = ctx.currentTime
    while (this.kicks.length > 1 && this.kicks[1] <= now) this.kicks.shift()
    const k = this.kicks[0]
    if (k === undefined || k > now) return 0
    return Math.exp(-(now - k) * 7)
  }

  setMood(m: Mood) {
    this.mood = m
    if (this.ctx) this.tone.frequency.setTargetAtTime(SONGS[m].cutoff, this.ctx.currentTime, 0.6)
  }

  async start(volume = 0.5) {
    if (!this.ctx) this.build()
    const ctx = this.ctx!
    if (ctx.state === 'suspended') await ctx.resume()
    this.on = true
    this.began = true
    this.target = volume
    this.next = Math.max(this.next, ctx.currentTime + 0.1)
    clearInterval(this.timer)
    this.timer = window.setInterval(this.tick, 100)
    this.master.gain.cancelScheduledValues(ctx.currentTime)
    this.master.gain.setTargetAtTime(volume, ctx.currentTime, 0.8)
  }

  async stop() {
    this.stopTrack()
    this.on = false
    clearInterval(this.timer)
    const ctx = this.ctx
    if (!ctx) return
    this.master.gain.cancelScheduledValues(ctx.currentTime)
    this.master.gain.setTargetAtTime(0, ctx.currentTime, 0.25)
    window.setTimeout(() => { if (!this.on) ctx.suspend().catch(() => {}) }, 1200)
  }

  /** Duck for another sound (e.g. a demo that plays music) without turning it off. */
  duck(quiet: boolean) {
    if (!this.ctx || !this.on) return
    this.master.gain.setTargetAtTime(quiet ? 0 : this.target, this.ctx.currentTime, 0.4)
  }

  get playing() { return this.on }
  /** True once the browser has actually let the audio run. */
  get running() { return this.on && this.ctx?.state === 'running' }
  get everStarted() { return this.began }
}

export const lofi = new Lofi()
if (import.meta.env.DEV) (window as unknown as { __lofi: Lofi }).__lofi = lofi
