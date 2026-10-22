export interface PickTarget {
  id: number
  /** Основание в клетках; z — высота над землёй */
  x: number
  y: number
  z?: number
  /** Радиус и высота самой модели; попадание считается с запасом (см. PICK_MIN_*) */
  radius: number
  height: number
  /** Запас на таче вместо TOUCH_MARGIN */
  touchMargin?: number
}

export interface PickRay {
  origin: { x: number; y: number; z: number }
  direction: { x: number; y: number; z: number }
}

/** Размеры цилиндров попадания (SPEC §3.5); на тач добавляется TOUCH_MARGIN (или touchMargin цели) */
export const PICK_MIN_RADIUS = 0.55
export const PICK_MIN_HEIGHT = 1.2
export const TOUCH_MARGIN = 0.4
export const TOWER_PICK_RADIUS = 0.8
export const TOWER_PICK_TOUCH_MARGIN = 0.2
export const TOWER_PICK_HEIGHT = 1.4

/** Расстояние вдоль луча до вертикального цилиндра (с крышками) или null */
export function rayCylinder(
  ray: PickRay,
  cx: number,
  cz: number,
  y0: number,
  y1: number,
  r: number,
): number | null {
  const { origin: o, direction: d } = ray
  let best: number | null = null
  const take = (t: number) => {
    if (t > 0 && (best === null || t < best)) best = t
  }
  const a = d.x * d.x + d.z * d.z
  const ox = o.x - cx
  const oz = o.z - cz
  if (a > 1e-12) {
    const b = 2 * (ox * d.x + oz * d.z)
    const disc = b * b - 4 * a * (ox * ox + oz * oz - r * r)
    if (disc >= 0) {
      const sq = Math.sqrt(disc)
      for (const t of [(-b - sq) / (2 * a), (-b + sq) / (2 * a)]) {
        const y = o.y + d.y * t
        if (y >= y0 && y <= y1) take(t)
      }
    }
  }
  if (Math.abs(d.y) > 1e-9) {
    for (const py of [y0, y1]) {
      const t = (py - o.y) / d.y
      const hx = ox + d.x * t
      const hz = oz + d.z * t
      if (hx * hx + hz * hz <= r * r) take(t)
    }
  }
  return best
}

/**
 * Выбор цели по лучу: цилиндр вокруг всей модели с запасом, побеждает ближайшая к камере.
 * touch — расширенный запас для пальца.
 */
export function pickTarget(ray: PickRay, targets: PickTarget[], touch = false): number | null {
  let bestId: number | null = null
  let bestT = Infinity
  for (const t of targets) {
    const m = touch ? (t.touchMargin ?? TOUCH_MARGIN) : 0
    const y0 = (t.z ?? 0) - m * 0.5
    const hit = rayCylinder(
      ray,
      t.x,
      t.y,
      y0,
      (t.z ?? 0) + Math.max(t.height, PICK_MIN_HEIGHT) + m,
      Math.max(t.radius, PICK_MIN_RADIUS) + m,
    )
    if (hit !== null && hit < bestT) {
      bestT = hit
      bestId = t.id
    }
  }
  return bestId
}
