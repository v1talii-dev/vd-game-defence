import { describe, expect, it } from 'vitest'
import { loadDesertBase, rawDesertBase } from '../../../../tests/helpers/level'
import { parseTiledLevel, type Point } from './level'

const raw = rawDesertBase()
const level = loadDesertBase()

function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

describe('parseTiledLevel: desert-base', () => {
  it('размер и путь в координатах клеток', () => {
    expect(level.width).toBe(24)
    expect(level.height).toBe(24)
    expect(level.spawn).toEqual(level.path[0])
    expect(level.hq).toEqual(level.path[level.path.length - 1])
    expect(level.path[0]).toEqual({ x: 0, y: 3.5 })
  })

  it('путь непрерывен: без нулевых отрезков, внутри карты, 3–4 поворота', () => {
    for (let i = 1; i < level.path.length; i++) {
      const a = level.path[i - 1]!
      const b = level.path[i]!
      expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeGreaterThan(0)
    }
    for (const p of level.path) {
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.x).toBeLessThanOrEqual(level.width)
      expect(p.y).toBeGreaterThanOrEqual(0)
      expect(p.y).toBeLessThanOrEqual(level.height)
    }
    expect(level.path.length - 2).toBeGreaterThanOrEqual(3)
    expect(level.path.length - 2).toBeLessThanOrEqual(4)
  })

  it('около 40 buildable-клеток, ни одна не лежит на пути', () => {
    expect(level.buildable.length).toBeGreaterThanOrEqual(35)
    expect(level.buildable.length).toBeLessThanOrEqual(45)
    for (const c of level.buildable) {
      const center = { x: c.x + 0.5, y: c.y + 0.5 }
      const d = Math.min(
        ...level.path.slice(1).map((b, i) => distToSegment(center, level.path[i]!, b)),
      )
      expect(d).toBeGreaterThan(0.5)
    }
  })

  it('штаб в противоположном углу от входа', () => {
    expect(level.spawn.x < level.width / 2 && level.spawn.y < level.height / 2).toBe(true)
    expect(level.hq.x > level.width / 2 && level.hq.y > level.height / 2).toBe(true)
  })

  it('отвергает невалидную карту', () => {
    expect(() => parseTiledLevel('x', { orientation: 'orthogonal' })).toThrow()
    expect(() => parseTiledLevel('x', { ...raw, layers: [] })).toThrow()
    const noPath = { ...raw, layers: raw.layers.filter((l) => l.type !== 'objectgroup') }
    expect(() => parseTiledLevel('x', noPath)).toThrow()
  })
})
