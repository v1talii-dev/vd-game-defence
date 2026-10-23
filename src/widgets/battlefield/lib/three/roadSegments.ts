// Геометрия сегментов дороги: чистая функция без three (проверяется unit-тестом)
export type Pt = { x: number; y: number }
export type RoadSegment = {
  /** центр в координатах клеток */
  cx: number
  cy: number
  /** длина вдоль направления движения */
  length: number
  /** поворот вокруг вертикальной оси (как в three: atan2(dx, dy)) */
  yaw: number
}

const ROAD_WIDTH = 1

/** Расстояние от точки до края карты вдоль направления (dx, dy) единичной длины */
function distToEdge(p: Pt, dx: number, dy: number, width: number, height: number): number {
  const tx = dx > 0 ? (width - p.x) / dx : dx < 0 ? -p.x / dx : Infinity
  const ty = dy > 0 ? (height - p.y) / dy : dy < 0 ? -p.y / dy : Infinity
  return Math.max(0, Math.min(tx, ty))
}

/**
 * Сегменты дороги: внутренние стыки перекрываются на 0.5 (без щелей на поворотах),
 * первый сегмент начинается в точке входа (на краю), последний доведён до края карты.
 */
export function roadSegments(path: readonly Pt[], width: number, height: number): RoadSegment[] {
  const out: RoadSegment[] = []
  for (let i = 0; i + 1 < path.length; i++) {
    const a = path[i]!
    const b = path[i + 1]!
    const len = Math.hypot(b.x - a.x, b.y - a.y)
    if (len === 0) continue
    const dx = (b.x - a.x) / len
    const dy = (b.y - a.y) / len
    const before = i === 0 ? 0 : ROAD_WIDTH / 2
    const after = i + 2 === path.length ? distToEdge(b, dx, dy, width, height) : ROAD_WIDTH / 2
    const shift = (len + after - before) / 2
    out.push({
      cx: a.x + dx * shift,
      cy: a.y + dy * shift,
      length: len + before + after,
      yaw: Math.atan2(b.x - a.x, b.y - a.y),
    })
  }
  return out
}
