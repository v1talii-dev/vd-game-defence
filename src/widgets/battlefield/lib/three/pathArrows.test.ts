import { describe, expect, it } from 'vitest'
import {
  ARROW_DURATION,
  ARROW_SPACING,
  arrowCount,
  arrowOpacity,
  cumulativeLengths,
  samplePath,
} from './pathArrows'

const L = [
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 4, y: 3 },
]

describe('pathArrows', () => {
  it('samplePath идёт по ломаной и задаёт направление сегмента', () => {
    const cum = cumulativeLengths(L)
    expect(cum).toEqual([0, 4, 7])
    const o = { x: 0, y: 0, yaw: 0 }
    expect(samplePath(L, cum, 2, o)).toMatchObject({ x: 2, y: 0 })
    expect(o.yaw).toBeCloseTo(Math.PI / 2)
    samplePath(L, cum, 5.5, o)
    expect([o.x, o.y, o.yaw]).toEqual([4, 1.5, 0])
    samplePath(L, cum, 99, o)
    expect([o.x, o.y]).toEqual([4, 3])
  })

  it('два пути дают независимые наборы стрелок', () => {
    const b = [
      { x: 0, y: 5 },
      { x: 10, y: 5 },
    ]
    const n = arrowCount(7) + arrowCount(10)
    expect(n).toBe(Math.floor(7 / ARROW_SPACING) + Math.floor(10 / ARROW_SPACING))
    expect(cumulativeLengths(b)[1]).toBe(10)
  })

  it('прозрачность: 0 до/после, плавный подъём и спад', () => {
    expect(arrowOpacity(0)).toBe(0)
    expect(arrowOpacity(ARROW_DURATION)).toBe(0)
    expect(arrowOpacity(ARROW_DURATION / 2)).toBeGreaterThan(0.5)
    expect(arrowOpacity(0.1)).toBeLessThan(arrowOpacity(0.3))
  })
})
