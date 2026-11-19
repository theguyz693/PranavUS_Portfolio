import { useMemo, useState } from 'react'
import { extractEvidence } from './collector/evidence.ts'
import { rankCandidates, hasClearWinner, type CatalogEntry } from './collector/matcher.ts'
import catalog from './collector/catalog.json'

const entries = catalog as CatalogEntry[]
const CHIPS = [
  { label: 'clean toy code', text: 'HRY93' },
  { label: 'name only', text: 'Porsche 911' },
  { label: 'garbled read', text: 'WARNING CHOKING HAZARD ~~ Porshe 911 GT3 RS ## THEN AND NOW 7/1O FJX93' },
]

export default function CollectorDemo() {
  const [text, setText] = useState(CHIPS[2].text)
  const result = useMemo(() => {
    const ev = extractEvidence(text)
    const list = rankCandidates(entries, ev, { limit: 6 })
    return { list, clear: hasClearWinner(list) }
  }, [text])

  return (
    <div className="demo">
      <p className="mono demo-note">Runs in your browser with the app&apos;s own matcher over a {entries.length}-car slice of the 4,041-release catalogue. Typed text stands in for camera OCR. No photos shown.</p>
      <h4 className="mono">identify a car</h4>
      <textarea className="qa" rows={2} value={text} onChange={(e) => setText(e.target.value)} aria-label="Noisy scan text" spellCheck={false} />
      <div className="demo-row">
        {CHIPS.map((c) => <button key={c.label} className="btn small" onClick={() => setText(c.text)}>{c.label}</button>)}
      </div>
      {result.list.length === 0 ? (
        <p className="mono dim">no confident candidates. The app would ask you to add the car manually.</p>
      ) : (
        <>
          <p className="mono dim">{result.clear ? 'clear leader, pre-selected (you still confirm)' : 'no clear winner: you choose'}</p>
          <ol className="cands">
            {result.list.map((c) => (
              <li key={c.entry.key} className={`cand ${c.confidence}`}>
                <div className="plate">
                  <strong>{c.entry.name}</strong>
                  <span className="mono">{c.entry.series} {c.entry.seriesNumber} · {c.entry.releaseYear} · {c.entry.modelNumber}</span>
                </div>
                <div className="mono"><span className="badge">{c.confidence} · {c.score}</span>{' '}{c.reasons.map((r) => r.label).join(' · ')}</div>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  )
}
