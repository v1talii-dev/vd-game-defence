import { describe, expect, it } from 'vitest'
import { clampView, distance, pinchZoom, zoomAt } from './math'

const b = { x: 0, y: 0, width: 1000, height: 800 }

describe('camera math', () => {
  it('clampView ограничивает центр границами', () => {
    expect(clampView({ cx: -50, cy: 9999, zoom: 1 }, b, 400, 200)).toEqual({
      cx: 200,
      cy: 700,
      zoom: 1,
    })
  })

  it('clampView центрирует, если мир меньше окна', () => {
    const r = clampView({ cx: 0, cy: 0, zoom: 0.5 }, b, 4000, 4000)
    expect([r.cx, r.cy]).toEqual([500, 400])
  })

  it('zoomAt сохраняет точку мира под курсором', () => {
    const v = { cx: 300, cy: 250, zoom: 1 }
    const [w, h, sx, sy] = [800, 600, 650, 120] as const
    const world = (q: typeof v) => [q.cx + (sx - w / 2) / q.zoom, q.cy + (sy - h / 2) / q.zoom]
    const r = zoomAt(v, 2.5, sx, sy, w, h)
    expect(world(r)[0]).toBeCloseTo(world(v)[0]!, 9)
    expect(world(r)[1]).toBeCloseTo(world(v)[1]!, 9)
  })

  it('pinchZoom масштабирует и ограничивает диапазон', () => {
    expect(pinchZoom(1, 100, 150, 0.5, 2)).toBe(1.5)
    expect(pinchZoom(1, 100, 900, 0.5, 2)).toBe(2)
    expect(pinchZoom(1, 0, 50, 0.5, 2)).toBe(1)
    expect(distance(0, 0, 3, 4)).toBe(5)
  })
})
