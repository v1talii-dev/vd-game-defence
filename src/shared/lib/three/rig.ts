import { PerspectiveCamera, Raycaster, Vector2, Vector3, type Fog } from 'three'

// SPEC §3.5: x, y клетки -> мировые x, z; высота z -> мировая y; клетка = 1 единица
export function cellToWorld(x: number, y: number, z = 0): Vector3 {
  return new Vector3(x, z, y)
}

export function worldToCell(v: { x: number; y: number; z: number }): {
  x: number
  y: number
  z: number
} {
  return { x: v.x, y: v.z, z: v.y }
}

export const CAMERA_FOV = 30
export const CAMERA_PITCH = (50 * Math.PI) / 180
export const CAMERA_YAW = Math.PI / 4
export const CAMERA_MIN_ZOOM = 0.6
export const CAMERA_MAX_ZOOM = 6
/** Ширина внешнего поля земли вокруг карты, клеток (SPEC §3.5 «Кадр карты») */
export const FIELD_MARGIN = 40
/** Цвета внешнего поля, тумана и фона: фон = туман, чёрной пустоты нет */
export const FIELD_COLOR = 0x9c8a5e
export const FOG_COLOR = 0x85764f
/** Подгон карты под экран: >1 — чуть крупнее «впритык», углы карты слегка за кадром, остаётся запас пана */
const FIT_PADDING = 1.12
export interface CameraState {
  /** Точка карты (в клетках), на которую смотрит камера */
  x: number
  y: number
  zoom: number
  yaw: number
}

const baseDistOf = (mapW: number, mapH: number) =>
  (Math.max(mapW, mapH) * 1.15) / Math.tan(((CAMERA_FOV / 2) * Math.PI) / 180)

/** Ставит камеру на цель (tx, ty) на расстоянии dist под фиксированным наклоном */
function pose(cam: PerspectiveCamera, tx: number, ty: number, yaw: number, dist: number) {
  const h = Math.cos(CAMERA_PITCH) * dist
  cam.position.set(tx + Math.sin(yaw) * h, Math.sin(CAMERA_PITCH) * dist, ty + Math.cos(yaw) * h)
  cam.lookAt(tx, 0, ty)
  cam.updateMatrixWorld()
}

const CORNERS: [number, number][] = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
]
const probeCam = new PerspectiveCamera(CAMERA_FOV, 1, 0.1, 500)
const probeRay = new Raycaster()
const probeNdc = new Vector2()
const probeVec = new Vector3()

/** Стартовый zoom: карта целиком заполняет вьюпорт (по самому дальнему углу карты) */
export function fitZoom(aspect: number, mapW: number, mapH: number, yaw = CAMERA_YAW): number {
  probeCam.aspect = aspect
  probeCam.updateProjectionMatrix()
  const base = baseDistOf(mapW, mapH)
  let z = 1
  for (let i = 0; i < 4; i++) {
    pose(probeCam, 0, 0, yaw, base / z)
    let m = 0
    for (const [sx, sy] of CORNERS) {
      probeVec.set((sx * mapW) / 2, 0, (sy * mapH) / 2).project(probeCam)
      m = Math.max(m, Math.abs(probeVec.x), Math.abs(probeVec.y))
    }
    z *= FIT_PADDING / m
  }
  return z
}

/** Смещения углов вьюпорта на земле относительно цели при zoom = 1 (x, z мира) */
function groundExtent(aspect: number, yaw: number, base: number) {
  probeCam.aspect = aspect
  probeCam.updateProjectionMatrix()
  pose(probeCam, 0, 0, yaw, base)
  const e = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
  for (const [sx, sy] of CORNERS) {
    probeRay.setFromCamera(probeNdc.set(sx, sy), probeCam)
    const { origin: o, direction: d } = probeRay.ray
    const t = -o.y / Math.min(d.y, -1e-6)
    e.minX = Math.min(e.minX, o.x + d.x * t)
    e.maxX = Math.max(e.maxX, o.x + d.x * t)
    e.minY = Math.min(e.minY, o.z + d.z * t)
    e.maxY = Math.max(e.maxY, o.z + d.z * t)
  }
  return e
}

/**
 * Ограничения камеры: zoom не меньше диапазона и не меньше того, при котором вьюпорт выходит за внешнее поле;
 * цель сдвигается так, чтобы углы вьюпорта на земле оставались внутри поля (смещения углов ~ 1/zoom)
 */
export function clampCameraState(
  s: CameraState,
  mapW: number,
  mapH: number,
  aspect = 16 / 9,
): CameraState {
  const c = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
  const e = groundExtent(aspect, s.yaw, baseDistOf(mapW, mapH))
  const fieldMin = Math.max(
    (e.maxX - e.minX) / (mapW + 2 * FIELD_MARGIN),
    (e.maxY - e.minY) / (mapH + 2 * FIELD_MARGIN),
  )
  const zoom = c(s.zoom, Math.max(CAMERA_MIN_ZOOM, fieldMin), CAMERA_MAX_ZOOM)
  const axis = (v: number, size: number, lo: number, hi: number) =>
    c(v, -FIELD_MARGIN - lo / zoom, size + FIELD_MARGIN - hi / zoom)
  return {
    x: axis(s.x, mapW, e.minX, e.maxX),
    y: axis(s.y, mapH, e.minY, e.maxY),
    zoom,
    yaw: s.yaw,
  }
}

/** Перспективная камера над картой; состояние {цель, zoom, yaw}, пан/зум, проекция клеток */
export function createCameraRig(aspect: number, mapW: number, mapH: number, yaw = CAMERA_YAW) {
  const camera = new PerspectiveCamera(CAMERA_FOV, aspect, 0.1, 500)
  const baseDist = baseDistOf(mapW, mapH)
  const state: CameraState = {
    x: mapW / 2,
    y: mapH / 2,
    zoom: fitZoom(aspect, mapW, mapH, yaw),
    yaw,
  }
  const ray = new Raycaster()
  /** Туман сцены: near/far следуют за расстоянием до цели */
  let fog: Fog | null = null
  /** Пока игрок не менял zoom, при смене размера вьюпорта подгоняем карту заново */
  let userZoomed = false

  const place = () => {
    const dist = baseDist / state.zoom
    pose(camera, state.x, state.y, state.yaw, dist)
    if (fog) {
      fog.near = dist * 1.1
      fog.far = dist * 2.8
    }
  }
  place()

  /** Размер вьюпорта в пикселях нужен только пересчёту экран <-> клетка */
  let vw = 1
  let vh = 1

  const api = {
    camera,
    state,
    set fog(f: Fog | null) {
      fog = f
      place()
    },
    resize(a: number) {
      camera.aspect = a
      camera.updateProjectionMatrix()
      if (!userZoomed) state.zoom = fitZoom(a, mapW, mapH, state.yaw)
      Object.assign(state, clampCameraState(state, mapW, mapH, a))
      place()
    },
    setViewport(w: number, h: number) {
      vw = Math.max(1, w)
      vh = Math.max(1, h)
      api.resize(vw / vh)
    },
    setState(p: Partial<CameraState>) {
      if (p.zoom !== undefined) userZoomed = true
      Object.assign(state, clampCameraState({ ...state, ...p }, mapW, mapH, camera.aspect))
      place()
    },
    /** Сдвиг цели по земле относительно экрана: right вправо, forward вверх по экрану (клетки) */
    panGround(right: number, forward: number) {
      const s = Math.sin(state.yaw)
      const c = Math.cos(state.yaw)
      api.setState({
        x: state.x + right * c - forward * s,
        y: state.y - right * s - forward * c,
      })
    },
    /** Захват карты: точка под пальцем остаётся под ним при сдвиге на dx, dy пикселей */
    panByPixels(px: number, py: number, dx: number, dy: number) {
      const a = api.screenToCell(px, py)
      const b = api.screenToCell(px + dx, py + dy)
      if (a && b) api.setState({ x: state.x - (b.x - a.x), y: state.y - (b.y - a.y) })
    },
    /** Зум в множитель factor с сохранением клетки под курсором */
    zoomAt(factor: number, px: number, py: number) {
      const before = api.screenToCell(px, py)
      api.setState({ zoom: state.zoom * factor })
      const after = before && api.screenToCell(px, py)
      if (before && after)
        api.setState({ x: state.x + before.x - after.x, y: state.y + before.y - after.y })
    },
    /** Клетка (дробные координаты; центр клетки i — i + 0.5) -> пиксели вьюпорта */
    cellToScreen(cell: { x: number; y: number; z?: number }): { x: number; y: number } {
      const v = cellToWorld(cell.x, cell.y, cell.z ?? 0).project(camera)
      return { x: ((v.x + 1) / 2) * vw, y: ((1 - v.y) / 2) * vh }
    },
    /** Пиксели -> точка на плоскости z=0 (дробные клетки); null — луч не пересекает землю */
    screenToCell(px: number, py: number): { x: number; y: number } | null {
      const r = api.rayAt(px, py)
      if (r.direction.y >= -1e-6) return null
      const t = -r.origin.y / r.direction.y
      return { x: r.origin.x + r.direction.x * t, y: r.origin.z + r.direction.z * t }
    },
    /** Целая клетка под точкой экрана или null вне карты */
    pickCell(px: number, py: number): { x: number; y: number } | null {
      const p = api.screenToCell(px, py)
      if (!p) return null
      const x = Math.floor(p.x)
      const y = Math.floor(p.y)
      return x < 0 || y < 0 || x >= mapW || y >= mapH ? null : { x, y }
    },
    rayAt(px: number, py: number) {
      ray.setFromCamera(new Vector2((px / vw) * 2 - 1, 1 - (py / vh) * 2), camera)
      return ray.ray
    },
  }
  return api
}
