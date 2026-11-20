/** Small shared state for the room's playful effects (lamp switch, idle flicker, disco). Read every frame by the 3D scene. */
export const fx = {
  lamp: 'auto' as 'auto' | 'on' | 'off', // auto follows the time of day
  effective: 0, // the lamp's current brightness before flicker, written by the scene
  flick: 1, // 0..1 multiplier used by the idle flicker
  disco: false,
  screen: null as null | { x: number; y: number; w: number; h: number }, // the monitor's glass on the page, in CSS pixels (set while zoomed in)
  pulse: 0, // one soft hit when the party starts, fading over a couple of seconds
  wake: null as null | (() => void), // asks the scene to draw a frame (needed when the render loop is on demand)
}

/** Click on the lamp: if it is giving light turn it off, otherwise turn it on. */
export function toggleLamp() {
  fx.lamp = fx.effective > 1 ? 'off' : 'on'
  fx.wake?.()
}
