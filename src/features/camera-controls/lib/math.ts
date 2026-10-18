/** Камера описывается центром обзора в мире и зумом (как в Phaser: зум вокруг центра) */
export interface View {
  cx: number
  cy: number
  zoom: number
}

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

function clampAxis(c: number, min: number, size: number, viewSize: number): number {
  // мир меньше окна — центрируем
  return size <= viewSize ? min + size / 2 : clamp(c, min + viewSize / 2, min + size - viewSize / 2)
}

/** Центр камеры внутри границ мира для окна viewW x viewH (в пикселях экрана) */
export function clampView(v: View, b: Bounds, viewW: number, viewH: number): View {
  return {
    zoom: v.zoom,
    cx: clampAxis(v.cx, b.x, b.width, viewW / v.zoom),
    cy: clampAxis(v.cy, b.y, b.height, viewH / v.zoom),
  }
}

/** Зум так, чтобы точка мира под экранной точкой (sx, sy) осталась на месте */
export function zoomAt(
  v: View,
  newZoom: number,
  sx: number,
  sy: number,
  viewW: number,
  viewH: number,
): View {
  const dx = sx - viewW / 2
  const dy = sy - viewH / 2
  return {
    zoom: newZoom,
    cx: v.cx + dx / v.zoom - dx / newZoom,
    cy: v.cy + dy / v.zoom - dy / newZoom,
  }
}

export const distance = (ax: number, ay: number, bx: number, by: number): number =>
  Math.hypot(bx - ax, by - ay)

/** Новый зум при pinch: пропорционально изменению расстояния между пальцами */
export function pinchZoom(
  zoom: number,
  prevDist: number,
  dist: number,
  min: number,
  max: number,
): number {
  return prevDist <= 0 ? zoom : clamp((zoom * dist) / prevDist, min, max)
}
