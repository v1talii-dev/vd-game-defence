// Debug-оверлей 3D (?debug=1): хитбоксы, траектории снарядов, статистика рендера
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  MeshBasicMaterial,
  Quaternion,
  Vector3,
  type Scene,
  type WebGLRenderer,
} from 'three'
import { projectilePosition, type ProjectileState } from '@/entities/projectile'

type Disposables = { dispose(): void }[]

const CAP = 256
const MAX_TRAJ = 128
const SEG = 12

export function createDebug3d(
  host: HTMLElement,
  scene: Scene,
  renderer: WebGLRenderer,
  disposables: Disposables,
) {
  const boxGeo = new BoxGeometry(1, 1, 1)
  const boxMat = new MeshBasicMaterial({ color: 0x00ff88, wireframe: true })
  const boxes = new InstancedMesh(boxGeo, boxMat, CAP)
  boxes.count = 0
  boxes.frustumCulled = false
  scene.add(boxes)

  const lineGeo = new BufferGeometry()
  const pos = new Float32Array(MAX_TRAJ * SEG * 2 * 3)
  lineGeo.setAttribute('position', new BufferAttribute(pos, 3))
  const lineMat = new LineBasicMaterial({ color: 0xffd27a })
  const lines = new LineSegments(lineGeo, lineMat)
  lines.frustumCulled = false
  scene.add(lines)
  disposables.push(boxGeo, boxMat, boxes, lineGeo, lineMat)

  const el = document.createElement('div')
  el.dataset.testid = 'r3d-debug'
  el.style.cssText =
    'position:absolute;left:4px;top:4px;padding:2px 6px;font:12px monospace;color:#0f8;background:#000a;white-space:pre;pointer-events:none;z-index:5'
  host.appendChild(el)

  const m = new Matrix4()
  const q = new Quaternion()
  const p = new Vector3()
  const s = new Vector3()
  let nBox = 0
  let nSeg = 0
  let fps = 60

  return {
    begin() {
      nBox = nSeg = 0
    },
    hitbox(wx: number, wy: number, wz: number, w: number, h: number) {
      if (nBox < CAP)
        boxes.setMatrixAt(nBox++, m.compose(p.set(wx, wy + h / 2, wz), q, s.set(w, h, w)))
    },
    /** текущая траектория снаряда до точки попадания (cells -> world: x, z, y) */
    trajectory(pr: ProjectileState) {
      if (nSeg + SEG > MAX_TRAJ * SEG) return
      let prev = projectilePosition(pr, 0)
      for (let i = 1; i <= SEG; i++) {
        const c = projectilePosition(pr, i / SEG)
        const o = nSeg++ * 6
        pos[o] = prev.x
        pos[o + 1] = prev.z
        pos[o + 2] = prev.y
        pos[o + 3] = c.x
        pos[o + 4] = c.z
        pos[o + 5] = c.y
        prev = c
      }
    },
    end(dtMs: number, info: string) {
      boxes.count = nBox
      boxes.instanceMatrix.needsUpdate = true
      lineGeo.setDrawRange(0, nSeg * 2)
      lineGeo.attributes.position!.needsUpdate = true
      if (dtMs > 0) fps += (1000 / dtMs - fps) * 0.1
      const r = renderer.info
      el.textContent =
        `fps ${fps.toFixed(0)}  calls ${r.render.calls}  tris ${r.render.triangles}\n` +
        `geo ${r.memory.geometries}  tex ${r.memory.textures}\n${info}`
    },
    dispose() {
      el.remove()
    },
  }
}
