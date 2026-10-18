import type { Point } from './iso'

/** Позиция сущности на двух последних тиках, для интерполяции между тиками */
export interface Tracked {
  px: number
  py: number
  x: number
  y: number
  tick: number
}

/** Обновляет запись; новый тик сдвигает текущую позицию в предыдущую */
export function trackPosition(
  rec: Tracked | undefined,
  x: number,
  y: number,
  tick: number,
): Tracked {
  if (!rec) return { px: x, py: y, x, y, tick }
  if (rec.tick !== tick) {
    rec.px = rec.x
    rec.py = rec.y
    rec.x = x
    rec.y = y
    rec.tick = tick
  }
  return rec
}

/** Позиция между предыдущим и текущим тиком, alpha в [0, 1] */
export function interpolated(rec: Tracked, alpha: number): Point {
  const t = Math.min(1, Math.max(0, alpha))
  return { x: rec.px + (rec.x - rec.px) * t, y: rec.py + (rec.y - rec.py) * t }
}
