/**
 * A small generative lo-fi player: nothing is downloaded, so there is nothing to license.
 * Everything is synthesised live with the Web Audio API. Two moods: the room (warmer, slower)
 * and the website (lighter, a different key and progression).
 */
export type Mood = 'room' | 'site'

type Song = { bpm: number; swing: number; chords: number[][]; bass: number[]; scale: number[]; cutoff: number }

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
  private schedule(step: number, t: number) {
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
    while (this.next < ctx.currentTime + 0.35) {
      const song = SONGS[this.mood]
      const eighth = 60 / song.bpm / 2
      // swing: push every off-beat eighth late
      const swing = this.step % 2 === 1 ? eighth * song.swing : 0
      this.schedule(this.step, this.next + swing)
      this.next += eighth
      this.step++
    }
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
    this.target = volume
    this.next = Math.max(this.next, ctx.currentTime + 0.1)
    clearInterval(this.timer)
    this.timer = window.setInterval(this.tick, 100)
    this.master.gain.cancelScheduledValues(ctx.currentTime)
    this.master.gain.setTargetAtTime(volume, ctx.currentTime, 0.8)
  }

  async stop() {
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
}

export const lofi = new Lofi()
