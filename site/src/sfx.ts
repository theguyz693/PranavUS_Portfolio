/**
 * Small interface sounds, synthesised live with the Web Audio API: nothing to download, nothing to license.
 * Every sound is a few milliseconds long and quiet on purpose.
 */
import files from './data/sfxfiles.json'

export type Sfx = 'glide' | 'tick' | 'click' | 'soft' | 'confirm' | 'pop' | 'off' | 'back' | 'whoosh' | 'swish' | 'switch' | 'success' | 'riser' | 'card' | 'paper' | 'thunk' | 'print' | 'ding' | 'swoosh'

class SfxEngine {
  private ctx: AudioContext | null = null
  private out!: GainNode
  private noise!: AudioBuffer
  private last: Partial<Record<Sfx, number>> = {}
  enabled = true
  volume = 0.55

  private get c() {
    if (!this.ctx) {
      const ctx = new AudioContext()
      this.ctx = ctx
      this.out = ctx.createGain()
      this.out.gain.value = this.volume
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 9000
      this.out.connect(lp); lp.connect(ctx.destination)
      void this.file('swoosh')
      this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
      const d = this.noise.getChannelData(0)
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    }
    return this.ctx
  }

  private tone(type: OscillatorType, f0: number, f1: number, len: number, vol: number, at = 0) {
    const c = this.c, t = c.currentTime + at
    const o = c.createOscillator(), g = c.createGain()
    o.type = type
    o.frequency.setValueAtTime(f0, t)
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + len)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(vol, t + 0.004)
    g.gain.exponentialRampToValueAtTime(0.0001, t + len)
    o.connect(g); g.connect(this.out)
    o.start(t); o.stop(t + len + 0.02)
  }

  private hiss(type: BiquadFilterType, f0: number, f1: number, len: number, vol: number, at = 0, q = 1) {
    const c = this.c, t = c.currentTime + at
    const s = c.createBufferSource(); s.buffer = this.noise
    const f = c.createBiquadFilter(); f.type = type; f.Q.value = q
    f.frequency.setValueAtTime(f0, t)
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + len)
    const g = c.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(vol, t + len * 0.25)
    g.gain.exponentialRampToValueAtTime(0.0001, t + len)
    s.connect(f); f.connect(g); g.connect(this.out)
    s.start(t, Math.random() * 0.5, len + 0.05)
  }

  // sounds that come from files in the music folder (see scripts/sync-content.mjs), decoded the first time they are needed
  private buffers: Record<string, AudioBuffer | null | undefined> = {}
  private async file(name: string) {
    const url = (files as Record<string, string>)[name]
    if (!url) return null
    if (this.buffers[name] !== undefined) return this.buffers[name]
    this.buffers[name] = null
    try {
      const data = await fetch(url).then((r) => r.arrayBuffer())
      this.buffers[name] = await this.c.decodeAudioData(data)
    } catch { /* falls back to the synthesised version */ }
    return this.buffers[name]
  }
  private playBuffer(buf: AudioBuffer, vol: number, rate = 1) {
    const c = this.c
    const s = c.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate
    const g = c.createGain(); g.gain.value = vol
    s.connect(g); g.connect(this.out); s.start()
  }

  /** `strength` (0..1) scales the volume; used by the scroll swish, which follows how fast you scroll. */
  play(name: Sfx, strength = 1) {
    if (!this.enabled) return
    const c = this.c
    if (c.state === 'suspended') void c.resume()
    if (c.state !== 'running') return // the browser has not allowed sound yet (no click or key press so far)
    const now = performance.now()
    const gap: Partial<Record<Sfx, number>> = { tick: 70, swish: 160, card: 120, glide: 260, swoosh: 220 }
    if (now - (this.last[name] ?? 0) < (gap[name] ?? 25)) return
    this.last[name] = now
    const v = strength
    switch (name) {
      case 'swoosh': { // the swoosh file, with a little variation each time; the synthesised whoosh covers until it has loaded
        const buf = this.buffers.swoosh
        if (buf) this.playBuffer(buf, 0.55 * v, 0.92 + Math.random() * 0.16)
        else { void this.file('swoosh'); this.hiss('bandpass', 350, 2400, 0.3, 0.12 * v, 0, 0.8) }
        break
      }
      case 'glide': // a soft tonal hush for scrolling (no noise)
        this.tone('sine', 300, 210, 0.16, 0.03 * v); this.tone('sine', 450, 315, 0.16, 0.015 * v)
        break
      case 'tick': this.tone('sine', 2100, 1500, 0.025, 0.035 * v); break
      case 'click': this.tone('triangle', 1000, 600, 0.05, 0.1 * v); this.hiss('highpass', 4000, 4000, 0.02, 0.05 * v); break
      case 'soft': this.tone('sine', 640, 520, 0.07, 0.09 * v); break
      case 'confirm': this.tone('triangle', 520, 520, 0.09, 0.1 * v); this.tone('triangle', 780, 780, 0.14, 0.1 * v, 0.07); break
      case 'pop': this.tone('sine', 280, 760, 0.09, 0.13 * v); break
      case 'off': this.tone('sine', 700, 260, 0.1, 0.11 * v); break
      case 'back': this.tone('sine', 240, 130, 0.1, 0.13 * v); this.hiss('lowpass', 800, 400, 0.05, 0.05 * v); break
      case 'whoosh': this.hiss('bandpass', 350, 2400, 0.32, 0.16 * v, 0, 0.8); this.tone('sine', 180, 90, 0.2, 0.05 * v); break
      case 'swish': this.hiss('bandpass', 900, 2600, 0.16, 0.1 * v, 0, 0.7); break
      case 'switch': this.hiss('highpass', 3500, 3500, 0.015, 0.14 * v); this.tone('square', 220, 160, 0.03, 0.06 * v); this.hiss('highpass', 3000, 3000, 0.015, 0.1 * v, 0.07); this.tone('triangle', 140, 90, 0.06, 0.1 * v, 0.07); break
      case 'success': [660, 830, 990].forEach((f, i) => this.tone('sine', f, f, 0.22, 0.09 * v, i * 0.07)); break
      case 'riser': this.hiss('bandpass', 250, 3200, 0.7, 0.16 * v, 0, 1.4); this.tone('sawtooth', 110, 440, 0.7, 0.05 * v); this.tone('sine', 60, 40, 0.3, 0.2 * v, 0.7); break
      case 'card': this.tone('sine', 880, 880, 0.04, 0.06 * v); this.tone('sine', 1320, 1320, 0.05, 0.04 * v, 0.03); break
      case 'paper': this.hiss('bandpass', 2600, 5200, 0.22, 0.1 * v, 0, 0.6); break
      case 'print': { // a small thermal printer: a steady motor with a stepping buzz, for about 1.9 seconds
        const n = 21
        for (let i = 0; i < n; i++) { this.hiss('bandpass', 2400 + (i % 3) * 300, 2400, 0.05, 0.07 * v, i * 0.09, 3); this.tone('square', 95, 90, 0.05, 0.025 * v, i * 0.09) }
        this.tone('sawtooth', 70, 78, 1.9, 0.02 * v)
        break
      }
      case 'ding': this.tone('sine', 1320, 1320, 0.35, 0.1 * v); this.tone('sine', 1980, 1980, 0.3, 0.05 * v, 0.01); break
      case 'thunk': this.tone('sine', 150, 70, 0.12, 0.18 * v); break
    }
  }
}

export const sfx = new SfxEngine()
