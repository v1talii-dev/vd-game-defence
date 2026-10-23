// Стрелки пути (SPEC §3.5): бегущие по земле шевроны вдоль маршрута(ов) в начале боя и волны.
// Только рендер; один InstancedMesh, в кадре без аллокаций.
import {
  DoubleSide,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Quaternion,
  Scene,
  Shape,
  ShapeGeometry,
  Vector3,
} from 'three'
import type { Pt } from './roadSegments'

/** Шаг между стрелками вдоль пути, клеток */
export const ARROW_SPACING = 1.4
/** Скорость бега, клеток в секунду */
const SPEED = 3
/** Длительность показа, с (появление и затухание входят) */
export const ARROW_DURATION = 2.6
const FADE_IN = 0.4
const FADE_OUT = 0.9
const MAX_OPACITY = 0.7
const Y = 0.06
const COLOR = 0xffb347

export interface PathSample {
  x: number
  y: number
  yaw: number
}

/** Накопленные длины вершин пути (cum[0] = 0) */
export function cumulativeLengths(path: readonly Pt[]): number[] {
  const cum = [0]
  for (let i = 1; i < path.length; i++)
    cum.push(cum[i - 1]! + Math.hypot(path[i]!.x - path[i - 1]!.x, path[i]!.y - path[i - 1]!.y))
  return cum
}

/** Точка и направление на расстоянии d от начала пути (d зажимается в [0, длина]); без аллокаций */
export function samplePath(
  path: readonly Pt[],
  cum: readonly number[],
  d: number,
  out: PathSample,
): PathSample {
  const total = cum[cum.length - 1]!
  const dd = Math.min(Math.max(d, 0), total)
  let i = 1
  while (i < cum.length - 1 && cum[i]! < dd) i++
  const a = path[i - 1]!
  const b = path[i]!
  const seg = cum[i]! - cum[i - 1]!
  const k = seg > 0 ? (dd - cum[i - 1]!) / seg : 0
  out.x = a.x + (b.x - a.x) * k
  out.y = a.y + (b.y - a.y) * k
  out.yaw = Math.atan2(b.x - a.x, b.y - a.y)
  return out
}

/** Число стрелок на пути */
export function arrowCount(length: number): number {
  return Math.max(0, Math.floor(length / ARROW_SPACING))
}

/** Прозрачность по времени с начала показа: плавное появление и затухание */
export function arrowOpacity(t: number): number {
  if (t < 0 || t >= ARROW_DURATION) return 0
  const a = Math.min(1, t / FADE_IN)
  const b = Math.min(1, (ARROW_DURATION - t) / FADE_OUT)
  return MAX_OPACITY * a * b
}

export interface PathArrows {
  /** запустить показ сначала */
  start(): void
  update(dtSec: number): void
  /** для e2e: показ идёт */
  active(): boolean
  /** сколько раз запускали (для e2e) */
  starts(): number
}

export function createPathArrows(
  scene: Scene,
  paths: readonly (readonly Pt[])[],
  disposables: { dispose(): void }[],
  reducedMotion: boolean,
): PathArrows {
  const cums = paths.map(cumulativeLengths)
  const counts = cums.map((c) => arrowCount(c[c.length - 1]!))
  const total = counts.reduce((s, n) => s + n, 0)
  // шеврон остриём в +z после поворота плоскости на землю
  const shape = new Shape()
  shape.moveTo(0, 0.28)
  shape.lineTo(0.3, -0.12)
  shape.lineTo(0.3, -0.28)
  shape.lineTo(0, 0.0)
  shape.lineTo(-0.3, -0.28)
  shape.lineTo(-0.3, -0.12)
  shape.closePath()
  const geo = new ShapeGeometry(shape).rotateX(Math.PI / 2)
  const mat = new MeshBasicMaterial({
    color: COLOR,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: DoubleSide,
  })
  disposables.push(geo, mat)
  const mesh = new InstancedMesh(geo, mat, Math.max(1, total))
  mesh.frustumCulled = false
  mesh.visible = false
  mesh.count = total
  // не участвует в пикинге ввода: ввод идёт через rig.pickCell и свои лучи, не по сцене
  mesh.raycast = () => {}
  scene.add(mesh)
  disposables.push(mesh)

  const _m = new Matrix4()
  const _q = new Quaternion()
  const _p = new Vector3()
  const _s = new Vector3(1, 1, 1)
  const _up = new Vector3(0, 1, 0)
  const _smp: PathSample = { x: 0, y: 0, yaw: 0 }
  let t = ARROW_DURATION // показ не идёт
  let nStarts = 0

  return {
    start() {
      t = 0
      nStarts++
    },
    active: () => t < ARROW_DURATION,
    starts: () => nStarts,
    update(dt) {
      if (t >= ARROW_DURATION) {
        mesh.visible = false
        return
      }
      t += dt
      const op = arrowOpacity(t)
      mesh.visible = op > 0
      if (!mesh.visible) return
      mat.opacity = op
      const shift = reducedMotion ? 0 : (t * SPEED) % ARROW_SPACING
      let n = 0
      for (let k = 0; k < paths.length; k++) {
        for (let i = 0; i < counts[k]!; i++) {
          samplePath(paths[k]!, cums[k]!, i * ARROW_SPACING + shift, _smp)
          _q.setFromAxisAngle(_up, _smp.yaw)
          mesh.setMatrixAt(n++, _m.compose(_p.set(_smp.x, Y, _smp.y), _q, _s))
        }
      }
      mesh.instanceMatrix.needsUpdate = true
    },
  }
}
