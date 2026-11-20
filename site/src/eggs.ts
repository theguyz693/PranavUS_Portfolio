import { sfx } from './sfx'

/** The easter eggs a visitor can find. Finding one shows a small box in the top right with the running count. */
export const EGGS = [
  { id: 'lamp', name: 'The desk lamp switch' },
  { id: 'mug', name: 'The hopping mug' },
  { id: 'steam', name: 'Steam from the mug' },
  { id: 'toybox', name: 'The toy box' },
  { id: 'party', name: 'Party mode' },
  { id: 'flicker', name: 'The idle flicker' },
  { id: 'snake', name: 'Snake on the monitor' },
  { id: 'note', name: 'The note on the shelf' },
  { id: 'clock', name: 'The alarm clock' },
  { id: 'radio', name: 'The radio' },
] as const
export type EggId = (typeof EGGS)[number]['id']
export type EggEvent = { id: EggId; name: string; count: number; total: number }

const KEY = 'portfolio-eggs'
const read = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] } }
const write = (v: string[]) => { try { localStorage.setItem(KEY, JSON.stringify(v)) } catch { /* private window */ } }

/** Call when something hidden is used. Only the first time counts, and only the first time shows the box. */
export function found(id: EggId) {
  const have = read()
  if (have.includes(id)) return
  const next = [...have, id]
  write(next)
  const egg = EGGS.find((e) => e.id === id)!
  sfx.play('success')
  window.dispatchEvent(new CustomEvent<EggEvent>('egg:found', { detail: { id, name: egg.name, count: next.length, total: EGGS.length } }))
}
