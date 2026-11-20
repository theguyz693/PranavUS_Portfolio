// Step 4: compose + encode the hype video.
//   node build.mjs   (needs raw_<shot>.mp4 from raw.py and overlays/*.png from captions.mjs; env FFMPEG optional)
// Output: out/master.mp4, out/demo-loop.mp4, out/demo-loop.webm, out/poster.jpg
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'

const FF = process.env.FFMPEG || 'ffmpeg'
const W = 1920
const H = 1200
const FPS = 30
const BG = '0x090909'

// ---- the edit: which part of which shot, how it moves, which caption rides on it -----------------
const SEG = [
  { name: 'ipod', ss: 0.1, dur: 4.7, z: [1.0, 1.08], fx: [0.5, 0.5], fy: [0.5, 0.53], cap: 'cap1', capAt: 0.55, capLen: 3.2 },
  { name: 'screens', ss: 0.0, dur: 2.4, z: [1.05, 1.16], fx: [0.44, 0.56], fy: [0.5, 0.5], cap: 'cap2', capAt: 0.3, capLen: 1.9 },
  { name: 'companion', ss: 2.0, dur: 2.4, z: [1.0, 1.15], fx: [0.5, 0.63], fy: [0.5, 0.52], cap: 'cap3', capAt: 0.3, capLen: 1.9 },
  { name: 'editorial', ss: 5.0, dur: 2.4, z: [1.0, 1.07], fx: [0.46, 0.53], fy: [0.5, 0.5], cap: 'cap4', capAt: 0.3, capLen: 1.9 }
]
const XF = 0.2 // cross-dissolve length between shots
const END_DUR = 1.8
const END_XF = 0.35

// ---- timeline -----------------------------------------------------------------------------------
let t = 0
SEG.forEach((s, i) => {
  s.start = i === 0 ? 0 : SEG[i - 1].start + SEG[i - 1].dur - XF
})
const L = SEG[SEG.length - 1].start + SEG[SEG.length - 1].dur
const endStart = L - END_XF
const T = endStart + END_DUR
console.log('timeline:', SEG.map((s) => `${s.name}@${s.start.toFixed(2)}`).join('  '), `end@${endStart.toFixed(2)}  total ${T.toFixed(2)}s`)
if (T > 15) throw new Error(`video is ${T.toFixed(2)}s, over the 15s cap`)

const inputs = []
const f = []
const ease = (n, N) => `(3*pow(${n}/${N},2)-2*pow(${n}/${N},3))`

// 1) shots: 2x upscale then zoompan (integer crops on the big frame = no sub-pixel jitter)
SEG.forEach((s, i) => {
  inputs.push('-ss', String(s.ss), '-t', String(s.dur + 0.1), '-i', `raw_${s.name}.mp4`)
  const N = Math.round(s.dur * FPS) - 1
  const E = ease('on', N)
  const z = `${s.z[0]}+(${s.z[1]}-${s.z[0]})*${E}`
  const fx = `(${s.fx[0]}+(${s.fx[1]}-${s.fx[0]})*${E})`
  const fy = `(${s.fy[0]}+(${s.fy[1]}-${s.fy[0]})*${E})`
  f.push(
    `[${i}:v]fps=${FPS},scale=${W * 2}:${H * 2}:flags=bicubic,` +
      `zoompan=z='${z}':x='max(0,min(iw-iw/zoom,${fx}*iw-iw/zoom/2))':y='max(0,min(ih-ih/zoom,${fy}*ih-ih/zoom/2))':d=1:s=${W}x${H}:fps=${FPS},` +
      `setsar=1,format=yuv420p,trim=duration=${s.dur},setpts=PTS-STARTPTS,fps=${FPS},settb=AVTB[s${i}]`
  )
})
// 2) end card base
const endIdx = SEG.length
inputs.push('-f', 'lavfi', '-t', String(END_DUR), '-i', `color=c=${BG}:s=${W}x${H}:r=${FPS}`)
f.push(`[${endIdx}:v]format=yuv420p,setsar=1,fps=${FPS},settb=AVTB[endbase]`)

// 3) cross-dissolve chain
let prev = 's0'
for (let i = 1; i < SEG.length; i++) {
  f.push(`[${prev}][s${i}]xfade=transition=fade:duration=${XF}:offset=${SEG[i].start.toFixed(3)}[x${i}]`)
  prev = `x${i}`
}
f.push(`[${prev}][endbase]xfade=transition=fade:duration=${END_XF}:offset=${endStart.toFixed(3)}[joined]`)

// 4) light motion blur across each cut, grade, vignette
const cuts = [...SEG.slice(1).map((s) => s.start + XF / 2), endStart + END_XF / 2]
const blurs = cuts
  .map((c) => [`gblur=sigma=2.5:enable='between(t,${(c - 0.15).toFixed(3)},${(c + 0.15).toFixed(3)})'`, `gblur=sigma=7:enable='between(t,${(c - 0.07).toFixed(3)},${(c + 0.07).toFixed(3)})'`])
  .flat()
  .join(',')
f.push(`[joined]${blurs},eq=contrast=1.05:saturation=1.08,vignette=angle=PI/3.2:mode=forward[graded]`)

// 5) captions (Anton, cream) slide up + fade, end card fades in
let cur = 'graded'
const addOverlay = (png, at, len, { slide = true, fadeOut = true, tag }) => {
  const idx = inputs.filter((x) => x === '-i').length
  inputs.push('-loop', '1', '-framerate', String(FPS), '-t', String(len), '-i', `overlays/${png}.png`)
  const fin = 0.35
  const fout = fadeOut ? `,fade=t=out:st=${(len - 0.28).toFixed(3)}:d=0.28:alpha=1` : ''
  f.push(`[${idx}:v]format=rgba,fade=t=in:st=0:d=${fin}:alpha=1${fout},setpts=PTS+${at.toFixed(3)}/TB[${tag}]`)
  const y = slide ? `'26*(1-min(1,max(0,(t-${at.toFixed(3)})/0.45)))'` : '0'
  f.push(`[${cur}][${tag}]overlay=x=0:y=${y}:eof_action=pass:format=auto[o_${tag}]`)
  cur = `o_${tag}`
}
SEG.forEach((s) => addOverlay(s.cap, s.start + s.capAt, s.capLen, { tag: s.cap }))
addOverlay('end', endStart + 0.3, END_DUR - 0.3, { slide: false, fadeOut: false, tag: 'endcard' })

// 6) loop blend: start and end both sit on flat #090909
f.push(`[${cur}]fade=t=in:st=0:d=0.55:color=${BG},fade=t=out:st=${(T - 0.5).toFixed(3)}:d=0.5:color=${BG},format=yuv420p[final]`)

fs.mkdirSync('out', { recursive: true })
const run = (args, label) => {
  const r = spawnSync(FF, args, { stdio: ['ignore', 'inherit', 'inherit'] })
  if (r.status !== 0) throw new Error(`${label} failed (ffmpeg exit ${r.status})`)
}
console.log('composing master ...')
run(['-y', '-loglevel', 'error', ...inputs, '-filter_complex', f.join(';'), '-map', '[final]', '-t', T.toFixed(3), '-r', String(FPS), '-c:v', 'libx264', '-crf', '12', '-preset', 'medium', '-pix_fmt', 'yuv420p', 'out/master.mp4'], 'master')

console.log('encoding mp4 / webm ...')
run(['-y', '-loglevel', 'error', '-i', 'out/master.mp4', '-an', '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'slow', '-crf', '20', '-maxrate', '3.2M', '-bufsize', '6.4M', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-movflags', '+faststart', 'out/demo-loop.mp4'], 'mp4')
run(['-y', '-loglevel', 'error', '-i', 'out/master.mp4', '-an', '-c:v', 'libvpx-vp9', '-b:v', '2800k', '-crf', '30', '-row-mt', '1', '-pix_fmt', 'yuv420p', '-r', String(FPS), 'out/demo-loop.webm'], 'webm')

const posterAt = process.env.POSTER_AT || '3.4'
run(['-y', '-loglevel', 'error', '-ss', posterAt, '-i', 'out/master.mp4', '-frames:v', '1', '-q:v', '2', 'out/poster.jpg'], 'poster')
console.log('done. total', T.toFixed(2), 's; poster @', posterAt, 's')
