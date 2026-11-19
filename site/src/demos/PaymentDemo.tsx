import { useRef, useState } from 'react'
import { retryDelayMs, nextStatusAfterFailure, EVENT_LEASE_MS, type EventStatus } from './payment/rules'

// Timings are sped up so the real 15 s retry and 30 s lease play out in a few seconds.
const SCALE = 10
const STAGES = ['Signature', 'Validate', 'Store once', 'Claim (lease)', 'Commit (txn)']
type StageState = 'idle' | 'ok' | 'stop' | 'fail'
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

interface StoredEvent { status: EventStatus; attempts: number }
interface Ledger { id: string; label: string; amount: number }

export default function PaymentDemo() {
  const [twice, setTwice] = useState(false)
  const [failFirst, setFailFirst] = useState(false)
  const [crash, setCrash] = useState(false)
  const [stages, setStages] = useState<StageState[]>(STAGES.map(() => 'idle'))
  const [ledger, setLedger] = useState<Ledger[]>([])
  const [log, setLog] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<EventStatus | null>(null)
  const store = useRef(new Map<string, StoredEvent>())
  const counter = useRef(0)
  const lastId = useRef<string | null>(null)

  const say = (s: string) => setLog((l) => [s, ...l].slice(0, 12))
  const mark = (i: number, s: StageState) => setStages((st) => st.map((v, k) => (k === i ? s : v)))

  async function deliver(id: string, opts: { failFirst: boolean; crash: boolean; sell?: boolean }, label: string, amount: number) {
    setStages(STAGES.map(() => 'idle'))
    say(`deliver ${id}`)
    for (const i of [0, 1]) { await sleep(260); mark(i, 'ok') }
    await sleep(260)
    if (store.current.has(id)) { mark(2, 'stop'); say(`${id}: duplicate blocked at "Store once", ledger unchanged`); return }
    store.current.set(id, { status: 'RECEIVED', attempts: 0 })
    mark(2, 'ok')
    const ev = store.current.get(id)!
    const setS = (s: EventStatus) => { ev.status = s; setStatus(s) }

    await sleep(260)
    setS('PROCESSING'); mark(3, 'ok')
    if (opts.crash) {
      say(`${id}: worker crashed, lease ${EVENT_LEASE_MS / 1000} s (shown ${EVENT_LEASE_MS / 1000 / SCALE} s)`)
      await sleep(EVENT_LEASE_MS / SCALE)
      say(`${id}: lease expired, recovery re-claims the event`)
    }
    ev.attempts = 1
    await sleep(300)
    if (opts.sell) {
      const next = nextStatusAfterFailure('business', ev.attempts)
      setS(next); mark(4, 'fail')
      say(`${id}: business rule (sell 25 of 10 units) -> ${next}, not retried`)
      return
    }
    if (opts.failFirst) {
      mark(4, 'fail')
      const next = nextStatusAfterFailure('transient', ev.attempts)
      setS(next)
      const wait = retryDelayMs(ev.attempts)
      say(`${id}: commit failed, rolled back -> ${next}, retry in ${wait / 1000} s (shown ${wait / 1000 / SCALE} s)`)
      await sleep(wait / SCALE)
      ev.attempts = 2
      say(`${id}: attempt 2`)
      mark(4, 'idle')
      await sleep(300)
    }
    mark(4, 'ok'); setS('PROCESSED')
    setLedger((l) => [...l, { id, label, amount }])
    say(`${id}: PROCESSED, 1 payment recorded (attempt ${ev.attempts})`)
  }

  async function send(kind: 'pay' | 'sell' | 'redeliver') {
    if (busy) return
    setBusy(true)
    try {
      const sell = kind === 'sell'
      const id = kind === 'redeliver' && lastId.current ? lastId.current : `evt_${++counter.current}`
      lastId.current = id
      const label = sell ? 'Sell 25 of 10 units' : 'Pay Rahul'
      const opts = { failFirst, crash, sell }
      await deliver(id, opts, label, sell ? 0 : 1500)
      if (twice && kind !== 'redeliver') { await sleep(300); await deliver(id, opts, label, 1500) }
    } finally { setBusy(false) }
  }

  return (
    <div className="demo">
      <p className="mono demo-note">Simulated pipeline, runs in your browser. Rules ported from the project&apos;s pure functions. Times sped up {SCALE}x.</p>
      <div className="demo-row">
        <button className="btn" disabled={busy} onClick={() => send('pay')}>Pay Rahul ₹1,500 → Send</button>
        <button className="btn" disabled={busy || !lastId.current} onClick={() => send('redeliver')}>Re-deliver last event</button>
        <button className="btn" disabled={busy} onClick={() => send('sell')}>Sell 25 of 10 units</button>
      </div>
      <div className="demo-row toggles">
        <label><input type="checkbox" checked={twice} onChange={(e) => setTwice(e.target.checked)} /> Deliver twice</label>
        <label><input type="checkbox" checked={failFirst} onChange={(e) => setFailFirst(e.target.checked)} /> Fail first attempt</label>
        <label><input type="checkbox" checked={crash} onChange={(e) => setCrash(e.target.checked)} /> Crash mid-processing</label>
      </div>
      <ol className="stages" aria-label="Pipeline stages">
        {STAGES.map((s, i) => <li key={s} className={`stage-chip ${stages[i]}`}>{s}</li>)}
      </ol>
      <div className="demo-cols">
        <div>
          <h4 className="mono">ledger {status && <span>· last event {status}</span>}</h4>
          {ledger.length === 0 ? <p className="mono dim">empty</p> : <ul>{ledger.map((l) => <li key={l.id}>{l.label} ₹{l.amount.toLocaleString('en-IN')} <span className="mono dim">{l.id}</span></li>)}</ul>}
        </div>
        <div>
          <h4 className="mono">event log</h4>
          <ul className="log mono">{log.map((l, i) => <li key={i}>{l}</li>)}</ul>
        </div>
      </div>
    </div>
  )
}
