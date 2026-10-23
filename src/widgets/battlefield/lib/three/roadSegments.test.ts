import { describe, expect, it } from 'vitest'
import { loadDesertBase } from '../../../../../tests/helpers/level'
import { roadSegments } from './roadSegments'

const level = loadDesertBase()
const segs = roadSegments(level.path, level.width, level.height)

// ограничивающий прямоугольник сегмента (ширина дороги 1, сегменты осевые)
function bounds(s: (typeof segs)[number]) {
  const vertical = Math.abs(Math.cos(s.yaw)) > 0.5
  const hw = vertical ? 0.5 : s.length / 2
  const hh = vertical ? s.length / 2 : 0.5
  return { x0: s.cx - hw, x1: s.cx + hw, y0: s.cy - hh, y1: s.cy + hh }
}

describe('roadSegments: desert-base', () => {
  it('вся дорога внутри карты', () => {
    for (const s of segs) {
      const b = bounds(s)
      expect(b.x0).toBeGreaterThanOrEqual(-1e-9)
      expect(b.y0).toBeGreaterThanOrEqual(-1e-9)
      expect(b.x1).toBeLessThanOrEqual(level.width + 1e-9)
      expect(b.y1).toBeLessThanOrEqual(level.height + 1e-9)
    }
  })

  it('оба конца лежат на краях карты', () => {
    const first = bounds(segs[0]!)
    const last = bounds(segs[segs.length - 1]!)
    expect(first.x0).toBeCloseTo(0)
    const edges = [last.x0, last.y0, last.x1 - level.width, last.y1 - level.height]
    expect(edges.some((e) => Math.abs(e) < 1e-9)).toBe(true)
  })
})
