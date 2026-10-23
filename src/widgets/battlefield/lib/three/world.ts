// Статичная сцена: песок, дорога, плато-подставки под башни, декор (деревья и камни)
import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshLambertMaterial,
  Quaternion,
  Vector3,
  type BufferGeometry,
  type Scene,
} from 'three'
import type { LevelData } from '@/entities/level'
import { cellToWorld } from '@/shared/lib/three'
import type { GlbPart } from '@/shared/lib/three'
import { DECO_GLB } from './modelConfig'
import { PAD_H } from './models'
import { roadSegments } from './roadSegments'

type Disposables = { dispose(): void }[]

function distToSegment(
  px: number,
  py: number,
  a: { x: number; y: number },
  b: { x: number; y: number },
) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const l2 = dx * dx + dy * dy
  const t = l2 ? Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / l2)) : 0
  return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy))
}

// детерминированный шум по клетке (только для вида, не для симуляции)
function hash(x: number, y: number, salt: number): number {
  let h =
    (Math.imul(x + 1, 73856093) ^ Math.imul(y + 1, 19349663) ^ Math.imul(salt, 83492791)) >>> 0
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0
  return (h % 10000) / 10000
}

export function buildWorld(scene: Scene, level: LevelData, disposables: Disposables) {
  const track = <T extends BufferGeometry | MeshLambertMaterial | InstancedMesh>(x: T): T => (
    disposables.push(x),
    x
  )
  const lambert = (color: number) => track(new MeshLambertMaterial({ color }))

  const sand = new Mesh(track(new BoxGeometry(level.width, 0.04, level.height)), lambert(0xc9b27c))
  sand.position.copy(cellToWorld(level.width / 2, level.height / 2, -0.04))
  sand.matrixAutoUpdate = false
  sand.updateMatrix()
  scene.add(sand)

  const m = new Matrix4()
  const q = new Quaternion()
  const yAxis = new Vector3(0, 1, 0)
  const inst = (geo: BufferGeometry, color: number, n: number) => {
    const mesh = new InstancedMesh(track(geo), lambert(color), Math.max(1, n))
    mesh.count = 0
    scene.add(track(mesh))
    return mesh
  }
  const add = (mesh: InstancedMesh, p: Vector3, s: Vector3, yaw = 0) => {
    mesh.setMatrixAt(mesh.count++, m.compose(p, q.setFromAxisAngle(yAxis, yaw), s))
  }

  // плато: приподнятые площадки на клетках строительства
  const roadSegs = inst(new BoxGeometry(1, 0.04, 1), 0x6b5a3e, level.path.length)
  for (const s of roadSegments(level.path, level.width, level.height))
    add(roadSegs, cellToWorld(s.cx, s.cy, 0), new Vector3(1, 1, s.length), s.yaw)

  const pads = inst(new BoxGeometry(0.94, PAD_H, 0.94), 0x8fa36a, level.buildable.length)
  const one = new Vector3(1, 1, 1)
  for (const c of level.buildable) add(pads, new Vector3(c.x + 0.5, PAD_H / 2, c.y + 0.5), one)

  // декор: на свободных клетках вдали от дороги
  const taken = new Set(level.buildable.map((c) => c.y * level.width + c.x))
  const max = level.width * level.height
  const trunks = inst(new CylinderGeometry(0.05, 0.07, 0.3, 6), 0x5a3d22, max)
  const crowns = inst(new ConeGeometry(0.28, 0.7, 7), 0x3f6b34, max)
  const rocks = inst(new DodecahedronGeometry(0.2), 0x8a8478, max)
  const ruins = inst(new BoxGeometry(0.5, 0.35, 0.4), 0x7d766a, 2)
  const ruinAt: [number, number, number, number][] = []
  const treeAt: [number, number, number][] = []
  const rockAt: [number, number, number, number][] = []
  for (let y = 0; y < level.height; y++) {
    for (let x = 0; x < level.width; x++) {
      if (taken.has(y * level.width + x)) continue
      let near = Infinity
      for (let i = 0; i + 1 < level.path.length; i++)
        near = Math.min(near, distToSegment(x + 0.5, y + 0.5, level.path[i]!, level.path[i + 1]!))
      if (near < 1.3) continue
      const r = hash(x, y, 1)
      const cx = x + 0.2 + hash(x, y, 2) * 0.6
      const cy = y + 0.2 + hash(x, y, 3) * 0.6
      const k = 0.8 + hash(x, y, 4) * 0.6
      if (r >= 0.2 && r < 0.3 && ruinAt.length < 2 && near > 1.8) {
        // 1–2 руины подальше от дороги; до загрузки GLB — коробка-заглушка
        const yaw = hash(x, y, 5) * 6
        ruinAt.push([cx, cy, k, yaw])
        add(ruins, new Vector3(cx, 0.17 * k, cy), new Vector3(k, k, k), yaw)
      } else if (r < 0.12) {
        treeAt.push([cx, cy, k])
        add(trunks, new Vector3(cx, 0.15 * k, cy), new Vector3(k, k, k))
        add(crowns, new Vector3(cx, 0.55 * k, cy), new Vector3(k, k, k))
      } else if (r < 0.2) {
        rockAt.push([cx, cy, k, hash(x, y, 5) * 6])
        add(rocks, new Vector3(cx, 0.1 * k, cy), new Vector3(k, 0.7 * k, k), hash(x, y, 5) * 6)
      }
    }
  }
  for (const mesh of [roadSegs, pads, trunks, crowns, rocks, ruins]) mesh.instanceMatrix.needsUpdate = true

  // подмена декора моделями из GLB (дерево — один меш вместо ствола и кроны)
  return {
    applyGlbs(loaded: Map<string, GlbPart[]>) {
      const mat = track(new MeshLambertMaterial({ vertexColors: true }))
      const swap = (mesh: InstancedMesh, glb: GlbPart[] | undefined, place: () => void) => {
        const gp = glb?.[0]
        if (!gp) return
        mesh.geometry = track(gp.geo)
        mesh.material = mat
        mesh.count = 0
        place()
        mesh.instanceMatrix.needsUpdate = true
      }
      swap(crowns, loaded.get(DECO_GLB.tree.file), () => {
        trunks.count = 0
        for (const [cx, cy, k] of treeAt) add(crowns, new Vector3(cx, 0, cy), new Vector3(k, k, k))
      })
      swap(rocks, loaded.get(DECO_GLB.rock.file), () => {
        for (const [cx, cy, k, yaw] of rockAt)
          add(rocks, new Vector3(cx, 0, cy), new Vector3(k, k, k), yaw)
      })
      swap(ruins, loaded.get(DECO_GLB.ruin.file), () => {
        for (const [cx, cy, k, yaw] of ruinAt)
          add(ruins, new Vector3(cx, 0, cy), new Vector3(k, k, k), yaw)
      })
    },
  }
}
