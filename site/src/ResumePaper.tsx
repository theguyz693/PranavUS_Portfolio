import resume from './data/resume.json'
import { ReceiptPrinter } from './ReceiptPrinter'

/** The resume as the paper that comes out of the printer. Shared by the inline block and the old window. */
export default function ResumePaper() {
  const r = resume as typeof resume & { linkedin?: string | null }
  return (
    <ReceiptPrinter.Paper>
      <header className="rcpt-head">
        <h1>{r.name}</h1>
        <p>{r.location}<br />{r.phone}<br />{r.email}<br />{r.links.github.replace('https://', '')}</p>
      </header>

      <h2>Education</h2>
      <p><b>{r.education?.school}</b><br />{r.education?.degree}<br />Expected {r.education?.expected} · CGPA {r.education?.cgpa}</p>

      <h2>Experience</h2>
      {r.experience.map((x) => (
        <div key={x.org}>
          <p><b>{x.role}</b><br />{x.org} ({x.place})<br />{x.from} – {x.to}</p>
          <ul>{x.points.map((pt) => <li key={pt}>{pt}</li>)}</ul>
        </div>
      ))}

      <h2>Projects</h2>
      {r.projects.map((p) => (
        <div key={p.name}>
          <p><b>{p.name}</b><br /><span className="rcpt-dim">{p.stack}</span></p>
          <p>{p.text}</p>
        </div>
      ))}
      {r.additional && <p><b>Also:</b> {r.additional}</p>}

      <h2>Technical skills</h2>
      <ul className="rcpt-plain">
        {Object.entries(r.skills).map(([g, items]) => <li key={g}><b>{g}:</b> {(items as string[]).join(', ')}</li>)}
      </ul>
      <p className="rcpt-thanks">Thank you for reading.</p>
    </ReceiptPrinter.Paper>
  )
}
