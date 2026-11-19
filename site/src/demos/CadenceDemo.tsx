import { Fragment, useMemo, useState } from 'react'
import { parseQuickAdd } from './cadence/quickParse.js'

interface Preset { label: string; days: (string | null)[]; today: number; missed: number[] }
const PRESETS: Preset[] = [
  { label: 'Push / Pull / Legs', days: ['Push', 'Pull', 'Legs', null, 'Upper', 'Lower', null], today: 4, missed: [2] },
  { label: '3× a week', days: ['Run', null, 'Run', null, 'Run', null, null], today: 4, missed: [] },
  { label: 'Every day', days: ['Read', 'Read', 'Read', 'Read', 'Read', 'Read', 'Read'], today: 3, missed: [1] },
]
const CHIPS = ['gym mon wed fri 7am', 'call mom tomorrow 6pm', 'pay rent friday !high', 'learn spanish by dec 31']
const fmtTime = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function CadenceDemo() {
  const [pi, setPi] = useState(0)
  const preset = PRESETS[pi]
  const [done, setDone] = useState<Set<number>>(new Set([0, 1]))
  const [text, setText] = useState(CHIPS[0])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parsed: any = useMemo(() => parseQuickAdd(text, new Date()), [text])

  const scheduled = preset.days.map((d, i) => (d ? i : -1)).filter((i) => i >= 0 && i <= preset.today)
  const doneCount = scheduled.filter((i) => done.has(i)).length
  const toggle = (i: number) => setDone((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n })

  const rows: [string, string][] = [
    ['kind', parsed.kind],
    ['title', parsed.title || '—'],
    ['repeat', parsed.recurrence ? (parsed.recurrence.label ?? parsed.recurrence.weekdays.map((i: number) => DAYS[i]).join(', ')) : '—'],
    ['date', parsed.date ? parsed.date.toDateString() : '—'],
    ['time', parsed.time ? fmtTime(parsed.time) + (parsed.duration ? ` · ${parsed.duration} min` : '') : '—'],
    ['priority', parsed.priority ?? '—'],
  ]

  return (
    <div className="demo">
      <p className="mono demo-note">Runs in your browser. The quick-add parser is the app&apos;s own code. The cycle row is a simplified illustration.</p>
      <h4 className="mono">a routine is a cycle, not a daily checkbox</h4>
      <div className="demo-row">
        {PRESETS.map((p, i) => (
          <button key={p.label} className={`btn ${i === pi ? 'on' : ''}`} onClick={() => { setPi(i); setDone(new Set([0])) }}>{p.label}</button>
        ))}
      </div>
      <ol className="cycle" aria-label="Routine cycle">
        {preset.days.map((d, i) => {
          const future = i > preset.today
          return (
            <li key={i}>
              <button
                className={`day ${done.has(i) ? 'done' : ''} ${i === preset.today ? 'today' : ''} ${preset.missed.includes(i) && !done.has(i) ? 'missed' : ''}`}
                disabled={!d || future}
                aria-pressed={done.has(i)}
                onClick={() => toggle(i)}
              >
                <span className="mono">{DAYS[i]}</span>
                <span>{d ?? 'rest'}</span>
              </button>
            </li>
          )
        })}
      </ol>
      <p className="mono">{doneCount} of {scheduled.length} scheduled days done this cycle</p>

      <h4 className="mono">quick add: type the way you talk</h4>
      <input className="qa" value={text} onChange={(e) => setText(e.target.value)} aria-label="Quick add" spellCheck={false} />
      <div className="demo-row">
        {CHIPS.map((c) => <button key={c} className="btn small" onClick={() => setText(c)}>{c}</button>)}
      </div>
      <dl className="spec parsed">
        {rows.map(([k, v]) => (<Fragment key={k}><dt>{k}</dt><dd>{v}</dd></Fragment>))}
      </dl>
    </div>
  )
}
