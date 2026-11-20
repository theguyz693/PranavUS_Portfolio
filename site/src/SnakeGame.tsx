import { useCallback, useEffect, useRef, useState } from 'react'
import { sfx } from './sfx'
import { found } from './eggs'

const N = 18 // the board is N x N
const KEY = 'portfolio-snake-best'
type P = { x: number; y: number }
const read = () => { try { return Number(localStorage.getItem(KEY)) || 0 } catch { return 0 } }
const save = (v: number) => { try { localStorage.setItem(KEY, String(v)) } catch { /* private window */ } }

/** A tiny Snake. Arrow keys or WASD, or the buttons on a touch screen. The best score is remembered on this device. */
export default function SnakeGame({ compact = false }: { compact?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const game = useRef({ snake: [{ x: 8, y: 9 }, { x: 7, y: 9 }, { x: 6, y: 9 }] as P[], dir: { x: 1, y: 0 }, next: { x: 1, y: 0 }, food: { x: 12, y: 9 } as P, over: false, started: false, score: 0 })
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(read)
  const [state, setState] = useState<'ready' | 'play' | 'over'>('ready')

  const placeFood = () => {
    const g = game.current
    let f: P
    do { f = { x: Math.floor(Math.random() * N), y: Math.floor(Math.random() * N) } } while (g.snake.some((s) => s.x === f.x && s.y === f.y))
    g.food = f
  }
  const reset = useCallback(() => {
    const g = game.current
    g.snake = [{ x: 8, y: 9 }, { x: 7, y: 9 }, { x: 6, y: 9 }]
    g.dir = { x: 1, y: 0 }; g.next = { x: 1, y: 0 }; g.over = false; g.score = 0
    placeFood(); setScore(0); setState('play'); g.started = true
    found('snake')
  }, [])

  const turn = useCallback((x: number, y: number) => {
    const g = game.current
    if (g.over) return
    if (x === -g.dir.x && y === -g.dir.y) return // no reversing into yourself
    g.next = { x, y }
    if (!g.started) reset()
  }, [reset])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key
      const map: Record<string, [number, number]> = { ArrowUp: [0, -1], w: [0, -1], W: [0, -1], ArrowDown: [0, 1], s: [0, 1], S: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0], ArrowRight: [1, 0], d: [1, 0], D: [1, 0] }
      if (map[k]) { e.preventDefault(); turn(...map[k]) }
      else if ((k === ' ' || k === 'Enter') && (game.current.over || !game.current.started)) { e.preventDefault(); reset() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [turn, reset])

  // one step every ~110 ms, a little faster as you grow
  useEffect(() => {
    let id = 0
    const tick = () => {
      const g = game.current
      if (g.started && !g.over) {
        g.dir = g.next
        const head = { x: g.snake[0].x + g.dir.x, y: g.snake[0].y + g.dir.y }
        const hit = head.x < 0 || head.y < 0 || head.x >= N || head.y >= N || g.snake.some((s) => s.x === head.x && s.y === head.y)
        if (hit) {
          g.over = true; setState('over'); sfx.play('thunk')
          if (g.score > read()) { save(g.score); setBest(g.score) }
        } else {
          g.snake.unshift(head)
          if (head.x === g.food.x && head.y === g.food.y) { g.score++; setScore(g.score); sfx.play('pop'); placeFood() } else g.snake.pop()
        }
      }
      draw()
      id = window.setTimeout(tick, Math.max(65, 120 - game.current.score * 2.5))
    }
    const draw = () => {
      const c = canvas.current
      const ctx = c?.getContext('2d')
      if (!c || !ctx) return
      const s = c.width / N, g = game.current
      ctx.fillStyle = '#0b0c0e'; ctx.fillRect(0, 0, c.width, c.height)
      ctx.fillStyle = 'rgba(233,227,216,0.04)'
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if ((i + j) % 2) ctx.fillRect(i * s, j * s, s, s)
      ctx.fillStyle = '#d98a7a'; ctx.beginPath(); ctx.arc((g.food.x + 0.5) * s, (g.food.y + 0.5) * s, s * 0.34, 0, Math.PI * 2); ctx.fill()
      g.snake.forEach((p, i) => { ctx.fillStyle = i === 0 ? '#d8b878' : `rgba(216,184,120,${Math.max(0.35, 1 - i * 0.03)})`; ctx.fillRect(p.x * s + 1.5, p.y * s + 1.5, s - 3, s - 3) })
    }
    tick()
    return () => clearTimeout(id)
  }, [])

  if (compact) {
    return (
      <div className="snake-wrap snake-compact">
        <div className="snake-score mono"><span>score {score}</span><span>best {best}</span></div>
        <div className="snake-board">
          <canvas ref={canvas} width={540} height={540} aria-label="Snake game board" />
          {state !== 'play' && (
            <button className="snake-overlay" onClick={reset}>
              <b>{state === 'over' ? 'Game over' : 'Snake'}</b>
              <span className="mono">{state === 'over' ? `scored ${score}. space to retry` : 'arrow keys or WASD. click to start'}</span>
            </button>
          )}
        </div>
        <div className="snake-pad" aria-hidden>
          <button onClick={() => turn(0, -1)}>↑</button>
          <button onClick={() => turn(-1, 0)}>←</button>
          <button onClick={() => turn(0, 1)}>↓</button>
          <button onClick={() => turn(1, 0)}>→</button>
        </div>
      </div>
    )
  }
  return (
    <article className="ps">
      <header className="ps-hero">
        <p className="ps-status">arrow keys or WASD</p>
        <h1>Snake</h1>
        <p className="ps-lead">A small break. Eat, grow, don't hit yourself.</p>
      </header>
      <section className="ps-sec snake-wrap">
        <div className="snake-score mono"><span>score {score}</span><span>best {best}</span></div>
        <div className="snake-board">
          <canvas ref={canvas} width={540} height={540} aria-label="Snake game board" />
          {state !== 'play' && (
            <button className="snake-overlay" onClick={reset}>
              <b>{state === 'over' ? 'Game over' : 'Ready?'}</b>
              <span className="mono">{state === 'over' ? `you scored ${score}. press space or click to retry` : 'press an arrow key, or click to start'}</span>
            </button>
          )}
        </div>
        <div className="snake-pad" aria-hidden>
          <button onClick={() => turn(0, -1)}>↑</button>
          <button onClick={() => turn(-1, 0)}>←</button>
          <button onClick={() => turn(0, 1)}>↓</button>
          <button onClick={() => turn(1, 0)}>→</button>
        </div>
      </section>
    </article>
  )
}
