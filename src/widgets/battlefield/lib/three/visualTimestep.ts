const STEP = 1 / 60

export function createVisualTimestep() {
  let remainder = 0
  return (dt: number, step: (seconds: number) => void) => {
    remainder += Math.max(dt, 0)
    let steps = 0
    while (remainder >= STEP && steps < 4) {
      step(STEP)
      remainder -= STEP
      steps++
    }
    if (remainder >= STEP) remainder %= STEP
  }
}
