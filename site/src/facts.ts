/** General trivia for the hero's "random fact": a new one on every visit. Not claims about the owner. */
export const FACTS = [
  'The first computer bug was a real moth, found in a Harvard Mark II relay in 1947.',
  'The word “robot” comes from the Czech word robota, meaning forced labour.',
  'The first email was sent in 1971 by Ray Tomlinson, who also chose the @ symbol.',
  'Python is named after Monty Python, not the snake.',
  'The first webcam pointed at a coffee pot in a Cambridge University lab, in 1991.',
  'Octopuses have three hearts.',
  'A day on Venus is longer than a year on Venus.',
  'Bananas are berries, but strawberries are not.',
  'Light from the Sun takes about eight minutes to reach Earth.',
  'Sharks are older than trees.',
  'The first domain name ever registered was symbolics.com, in 1985.',
  'The number of possible chess games is far larger than the number of atoms in the observable universe.',
  'Wombat droppings are cube-shaped.',
  'The QWERTY layout was shaped partly to keep typewriter keys from jamming.',
]
export const randomFact = (not?: string) => {
  let f = FACTS[Math.floor(Math.random() * FACTS.length)]
  while (f === not) f = FACTS[Math.floor(Math.random() * FACTS.length)]
  return f
}
