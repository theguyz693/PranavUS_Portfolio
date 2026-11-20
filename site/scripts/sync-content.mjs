// Reads ../contents/projects/*/project.json and writes src/data/projects.json.
// Normalises key differences and separates TODO strings (gaps) from publishable content.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, '..', 'contents', 'projects')
const isTodo = (s) => typeof s === 'string' && /^\s*TODO/i.test(s)
const pub = join(root, 'public', 'media')
const MEDIA = { loopWebm: 'demo-loop.webm', loopMp4: 'demo-loop.mp4', poster: ['poster.jpg', 'poster.png'], hero: ['hero.png', 'hero.jpg', 'hero.gif'], full: ['full-demo.mp4'] }
function syncMedia(slug) {
  // newer hype/ad cuts live in media/hype or media/ad and win over the files directly in media/
  const dirs = ['hype', 'ad', ''].map((d) => join(src, slug, 'media', d))
  const out = { loop: [], poster: null, hero: null, full: null }
  const take = (name) => {
    const dir = dirs.find((d) => existsSync(join(d, name)))
    if (!dir) return null
    mkdirSync(join(pub, slug), { recursive: true })
    copyFileSync(join(dir, name), join(pub, slug, name))
    return `/media/${slug}/${name}`
  }
  const first = (names) => names.map(take).find(Boolean) ?? null
  for (const n of [MEDIA.loopWebm, MEDIA.loopMp4]) { const u = take(n); if (u) out.loop.push(u) }
  out.poster = first(MEDIA.poster); out.hero = first(MEDIA.hero); out.full = first(MEDIA.full)
  return out
}
const arr = (v) => (Array.isArray(v) ? v : v ? [v] : [])

const projects = readdirSync(src, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(src, d.name, 'project.json')))
  .map((d) => {
    const j = JSON.parse(readFileSync(join(src, d.name, 'project.json'), 'utf8'))
    const todos = []
    const keep = (list) => arr(list).filter((s) => (isTodo(s) ? (todos.push(s), false) : true))
    const links = {}
    for (const [k, v] of Object.entries(j.links ?? {})) {
      if (k.endsWith('Note')) { if (isTodo(v)) todos.push(`${k}: ${v}`); continue }
      if (typeof v === 'string' && /^https?:/.test(v)) {
        // A repo with an open TODO note (e.g. "confirm public") is held back until confirmed.
        if (k === 'repo' && isTodo(j.links?.repoNote)) todos.push(`repo link held back: ${v}`)
        else links[k] = v
      }
      else if (isTodo(v)) todos.push(`${k}: ${v}`)
    }
    for (const k of ['statusNote']) if (isTodo(j[k])) todos.push(j[k])
    return {
      slug: j.slug ?? d.name,
      name: j.name,
      pitch: j.pitch,
      description: j.description ?? j.summary ?? '',
      stack: arr(j.stack),
      status: j.status,
      role: j.role ?? null,
      links,
      glimpseType: j.glimpseType,
      hardestProblem: j.hardestProblem ?? '',
      results: keep(j.results ?? j.outcome ?? j.result),
      highlights: keep(j.highlights),
      media: syncMedia(d.name),
      inRoom: j.inRoom !== false,
      order: j.order ?? 0,
      todos,
    }
  })
  .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))

mkdirSync(join(root, 'src', 'data'), { recursive: true })
writeFileSync(join(root, 'src', 'data', 'projects.json'), JSON.stringify(projects, null, 2))
console.log(`synced ${projects.length} projects`)

// Public profile (education etc. stay out) and a separate resume export used only by the Resume window.
const profilePath = join(src, '..', 'profile.json')
if (existsSync(profilePath)) {
  const p = JSON.parse(readFileSync(profilePath, 'utf8'))
  const resume = {
    name: p.name, location: p.location, email: p.email, phone: p.phone, links: p.links, linkedin: p.linkedin ?? null,
    education: p.resumeOnly?.education, experience: p.experience, skills: p.skills,
    projects: p.resumeOnly?.projects ?? [], additional: p.resumeOnly?.additional ?? '',
  }
  delete p.resumeOnly
  delete p._note
  p.photo = null
  for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
    const f = join(src, '..', `photo.${ext}`)
    if (existsSync(f)) { copyFileSync(f, join(root, 'public', `photo.${ext}`)); p.photo = `/photo.${ext}`; break }
  }
  for (const k of Object.keys(p)) if (k.endsWith('Note')) delete p[k]
  writeFileSync(join(root, 'src', 'data', 'profile.json'), JSON.stringify(p, null, 2))
  writeFileSync(join(root, 'src', 'data', 'resume.json'), JSON.stringify(resume, null, 2))
  console.log('synced profile + resume')
}
const pdf = join(src, '..', 'resume.pdf')
if (existsSync(pdf)) { copyFileSync(pdf, join(root, 'public', 'resume.pdf')); console.log('synced resume.pdf') }

// Party-mode tracks: any .mp3 / .m4a in ../music is copied to public/music and listed in src/data/music.json
{
  const musicDir = join(root, '..', 'music')
  const out = join(root, 'public', 'music')
  const list = []
  if (existsSync(musicDir)) {
    mkdirSync(out, { recursive: true })
    const audio = readdirSync(musicDir).filter((f) => /\.(mp3|m4a|mp4|ogg|wav)$/i.test(f)).sort()
    // files whose name says swoosh are interface sounds, not party music
    const fxFiles = audio.filter((f) => /swoosh/i.test(f))
    const sfxOut = join(root, 'public', 'sfx')
    const sfxMap = {}
    if (fxFiles.length) mkdirSync(sfxOut, { recursive: true })
    fxFiles.forEach((f) => { const ext = f.slice(f.lastIndexOf('.')).toLowerCase(); copyFileSync(join(musicDir, f), join(sfxOut, `swoosh${ext}`)); sfxMap.swoosh = `/sfx/swoosh${ext}` })
    writeFileSync(join(root, 'src', 'data', 'sfxfiles.json'), JSON.stringify(sfxMap, null, 2))
    audio.filter((f) => !fxFiles.includes(f) && /\.(mp3|m4a|mp4|ogg)$/i.test(f)).forEach((f, i) => {
      const ext = f.slice(f.lastIndexOf('.')).toLowerCase()
      const name = `party-${i + 1}${ext === '.mp4' ? '.m4a' : ext}` // an audio-only .mp4 is an m4a
      copyFileSync(join(musicDir, f), join(out, name))
      list.push(`/music/${name}`)
    })
  }
  writeFileSync(join(root, 'src', 'data', 'music.json'), JSON.stringify(list, null, 2))
  if (!existsSync(join(root, 'src', 'data', 'sfxfiles.json'))) writeFileSync(join(root, 'src', 'data', 'sfxfiles.json'), '{}')
  console.log(`synced ${list.length} party tracks`)
}
