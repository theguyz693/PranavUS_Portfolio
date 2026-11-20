import { randomFact } from './facts'

/**
 * The lines the paper on the shelf can show. Put your own lines here, one string each.
 * While this list is empty, the paper shows the general facts from facts.ts instead. Add more lines and it picks one at random.
 */
export const NOTES: string[] = [
  // vague hints about the easter eggs
  'the lamp has a switch. so might other things.',
  'some things in here do not like being clicked just once.',
  'sit still for a while. something notices.',
  'the mug has more than one trick.',
  'the box under the window is not empty.',
  'the clock is allowed to sleep.',
  'there is a very old code that makes this room throw a party.',
  'there is a little game hiding behind a screen.',
  'turn a dial. someone is always talking somewhere.',
  'please give me a job 😭🙏',
]

let last = ''
export function nextNote() {
  if (!NOTES.length) return (last = randomFact(last))
  let n = NOTES[Math.floor(Math.random() * NOTES.length)]
  while (NOTES.length > 1 && n === last) n = NOTES[Math.floor(Math.random() * NOTES.length)]
  return (last = n)
}
