import { PerspectiveCamera, Raycaster, Vector2, Vector3 } from 'three'

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
/** Скорость сглаживания поворота, 1/с */
const YAW_RATE = 10

export interface CameraState {
  /** Точка карты (в клетках), на которую смотрит камера */
  x: number
  y: number
  zoom: number
  yaw: number
}

/** Шаг плавного перехода yaw к цели; детерминирован, у цели защёлкивается точно */
export function stepYaw(yaw: number, target: number, dtSec: number): number {
  const diff = target - yaw
  if (Math.abs(diff) < 1e-3) return target
  return yaw + diff * (1 - Math.exp(-YAW_RATE * Math.max(0, dtSec)))
}

export function clampCameraState(s: CameraState, mapW: number, mapH: number): CameraState {
  const c = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
  return {
    x: c(s.x, 0, mapW),
    y: c(s.y, 0, mapH),
    zoom: c(s.zoom, CAMERA_MIN_ZOOM, CAMERA_MAX_ZOOM),
    yaw: s.yaw,
  }
}

/** Перспективная камера над картой; состояние {цель, zoom, yaw}, пан/зум/поворот, проекция клеток */
export function createCameraRig(aspect: number, mapW: number, mapH: number, yaw = CAMERA_YAW) {
  const camera = new PerspectiveCamera(CAMERA_FOV, aspect, 0.1, 500)
  const baseDist = (Math.max(mapW, mapH) * 1.15) / Math.tan(((CAMERA_FOV / 2) * Math.PI) / 180)
  const state: CameraState = { x: mapW / 2, y: mapH / 2, zoom: 1, yaw }
  let yawTarget = yaw
  const ray = new Raycaster()

  const place = () => {
    const dist = baseDist / state.zoom
    const h = Math.cos(CAMERA_PITCH) * dist
    camera.position.set(
      state.x + Math.sin(state.yaw) * h,
      Math.sin(CAMERA_PITCH) * dist,
      state.y + Math.cos(state.yaw) * h,
    )
    camera.lookAt(state.x, 0, state.y)
    camera.updateMatrixWorld()
  }
  place()

  /** Размер вьюпорта в пикселях нужен только пересчёту экран <-> клетка */
  let vw = 1
  let vh = 1

  const api = {
    camera,
    state,
    resize(a: number) {
      camera.aspect = a
      camera.updateProjectionMatrix()
      place()
    },
    setViewport(w: number, h: number) {
      vw = Math.max(1, w)
      vh = Math.max(1, h)
      api.resize(vw / vh)
    },
    setState(p: Partial<CameraState>) {
      Object.assign(state, clampCameraState({ ...state, ...p }, mapW, mapH))
      if (p.yaw !== undefined) yawTarget = state.yaw
      place()
    },
    /** Поворот на 90°: dir = +1 / -1; сам переход делает step */
    rotate(dir: 1 | -1) {
      yawTarget += (dir * Math.PI) / 2
    },
    /** Продвинуть сглаживание поворота; true, если камера сдвинулась */
    step(dtSec: number): boolean {
      if (state.yaw === yawTarget) return false
      state.yaw = stepYaw(state.yaw, yawTarget, dtSec)
      place()
      return true
    },
    /** Цель поворота; после завершения перехода равна state.yaw */
    yawTarget: () => yawTarget,
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
