// Модели-заглушки из примитивов (SPEC §3.5, §5): каждая деталь — один InstancedMesh на тип модели.
import {
  BoxGeometry,
  BufferAttribute,
  Color,
  BufferGeometry,
  CapsuleGeometry,
  CylinderGeometry,
  Euler,
  InstancedMesh,
  Matrix4,
  MeshLambertMaterial,
  OctahedronGeometry,
  Quaternion,
  SphereGeometry,
  Vector3,
  type Scene,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { EnemyType } from '@/entities/enemy'
import type { TowerType } from '@/entities/tower'
import type { GlbPart } from '@/shared/lib/three'
import { ENEMY_GLB, HEAD_NODES, TOWER_GLB, type GlbSpec } from './modelConfig'

type V3 = readonly [number, number, number]

interface PartSpec {
  geo: BufferGeometry
  color: number
  pos: V3
  rot?: V3
  // деталь вращается вместе с башней/стволом (поворотная голова)
  head?: boolean
}

interface Part {
  mesh: InstancedMesh
  local: Matrix4
  head: boolean
  // ноги пехоты: знак качания (противофаза), 0 — не нога
  leg: number
}

export interface Model {
  parts: Part[]
  n: number
  cap: number
}

type Disposables = { dispose(): void }[]

const TOWER_CAP = 64
const ENEMY_CAP = 256
// высота плато-подставки под башнями (только визуальная, в симуляции земля плоская)
export const PAD_H = 0.1

const _q = new Quaternion()
const _qe = new Quaternion()
const _e = new Euler()
const _p = new Vector3()
const _s = new Vector3()
const _root = new Matrix4()
const _headM = new Matrix4()
const _m = new Matrix4()
const _swing = new Matrix4()
// амплитуда качания ног, рад (~28°)
const LEG_SWING = 0.49
const UP = new Vector3(0, 1, 0)

export function createModels(scene: Scene, disposables: Disposables) {
  const g = <T extends BufferGeometry>(x: T): T => (disposables.push(x), x)
  const box = (w: number, h: number, d: number) => g(new BoxGeometry(w, h, d))

  // детали одного типа (корпус / голова) склеиваются в одну геометрию с цветами вершин: 2 draw calls на модель
  const build = (
    specs: PartSpec[],
    cap: number,
    mat: MeshLambertMaterial = new MeshLambertMaterial({ vertexColors: true }),
  ): Model => {
    const parts: Part[] = []
    for (const head of [false, true]) {
      const group = specs.filter((sp) => !!sp.head === head)
      if (!group.length) continue
      const geos = group.map((sp) => {
        const geo = sp.geo
          .clone()
          .applyMatrix4(
            new Matrix4().compose(
              _p.set(...sp.pos),
              sp.rot ? _qe.setFromEuler(_e.set(...sp.rot)) : _qe.identity(),
              _s.set(1, 1, 1),
            ),
          )
        const c = new Color(sp.color)
        const n = geo.getAttribute('position').count
        const col = new Float32Array(n * 3)
        for (let i = 0; i < n; i++) c.toArray(col, i * 3)
        geo.setAttribute('color', new BufferAttribute(col, 3))
        return geo
      })
      const merged = mergeGeometries(geos)
      for (const geo of geos) geo.dispose()
      disposables.push(merged, mat)
      const mesh = new InstancedMesh(merged, mat, cap)
      mesh.count = 0
      mesh.frustumCulled = false
      scene.add(mesh)
      disposables.push(mesh)
      parts.push({ mesh, local: new Matrix4(), head, leg: 0 })
    }
    return { parts, n: 0, cap }
  }

  const tubeGeo = g(new CylinderGeometry(0.1, 0.1, 0.55, 10))
  const towerSpecs: Record<TowerType, PartSpec[]> = {
    // пулемёт: узкий серо-синий цилиндр с длинным тонким стволом
    machineGun: [
      { geo: g(new CylinderGeometry(0.3, 0.36, 0.25, 12)), color: 0x5a6b7a, pos: [0, 0.125, 0] },
      { geo: box(0.28, 0.2, 0.3), color: 0x7c8fa0, pos: [0, 0.35, 0], head: true },
      { geo: box(0.07, 0.07, 0.6), color: 0x23292f, pos: [0, 0.37, 0.4], head: true },
    ],
    // ракета: широкая приземистая рыже-красная база и две толстые трубы-пусковые
    rocket: [
      { geo: g(new CylinderGeometry(0.4, 0.46, 0.2, 6)), color: 0x8a4a3a, pos: [0, 0.1, 0] },
      { geo: box(0.55, 0.26, 0.4), color: 0xb35d44, pos: [0, 0.33, 0], head: true },
      {
        geo: tubeGeo,
        color: 0xd9a441,
        pos: [-0.17, 0.5, 0.2],
        rot: [Math.PI / 2, 0, 0],
        head: true,
      },
      {
        geo: tubeGeo,
        color: 0xd9a441,
        pos: [0.17, 0.5, 0.2],
        rot: [Math.PI / 2, 0, 0],
        head: true,
      },
    ],
  }
  const towers = {
    machineGun: build(towerSpecs.machineGun, TOWER_CAP),
    rocket: build(towerSpecs.rocket, TOWER_CAP),
  }
  // заказ в очереди: те же модели, непрозрачные, цвета вершин обесцвечены к серо-синему «чертёжному» тону
  const ghostMat = new MeshLambertMaterial({ vertexColors: true })
  ghostMat.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      float gl = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(gl) * vec3(0.7, 0.85, 1.1), 0.7) * 0.8;`,
    )
  }
  disposables.push(ghostMat)
  const ghosts: Record<TowerType, Model> = {
    machineGun: build(towerSpecs.machineGun, TOWER_CAP, ghostMat),
    rocket: build(towerSpecs.rocket, TOWER_CAP, ghostMat),
  }

  const gunGeo = box(0.08, 0.08, 0.6)
  const enemies: Record<EnemyType, Model> = {
    // пехота — капсулы
    grunt: build(
      [
        { geo: g(new CapsuleGeometry(0.12, 0.22, 4, 8)), color: 0x7a8f4a, pos: [0, 0.23, 0] },
        { geo: g(new SphereGeometry(0.09, 8, 6)), color: 0x3d4a24, pos: [0, 0.5, 0] },
      ],
      ENEMY_CAP,
    ),
    grenadier: build(
      [
        { geo: g(new CapsuleGeometry(0.16, 0.2, 4, 8)), color: 0xb5651d, pos: [0, 0.24, 0] },
        { geo: box(0.2, 0.22, 0.12), color: 0x5c3a1a, pos: [0, 0.28, -0.17] },
      ],
      ENEMY_CAP,
    ),
    // техника — коробки
    technical: build(
      [
        { geo: box(0.4, 0.18, 0.75), color: 0xc9a227, pos: [0, 0.2, 0] },
        { geo: box(0.34, 0.17, 0.26), color: 0x8a6d12, pos: [0, 0.38, -0.1] },
        { geo: box(0.1, 0.1, 0.1), color: 0x23292f, pos: [0, 0.5, -0.25] },
      ],
      ENEMY_CAP,
    ),
    // танк — коробка с башней и стволом
    tank: build(
      [
        { geo: box(0.55, 0.25, 0.85), color: 0x4a5a3a, pos: [0, 0.2, 0] },
        { geo: box(0.36, 0.18, 0.4), color: 0x5d7048, pos: [0, 0.42, 0], head: true },
        { geo: gunGeo, color: 0x23292f, pos: [0, 0.43, 0.45], head: true },
      ],
      ENEMY_CAP,
    ),
    // дрон — плоский ромб; y = 0 соответствует z врага (высота полёта)
    drone: build(
      [
        {
          geo: g(new OctahedronGeometry(0.3).scale(1, 0.25, 1)),
          color: 0x9b59b6,
          pos: [0, 0.15, 0],
        },
      ],
      ENEMY_CAP,
    ),
    // босс — крупный тёмно-красный корпус, башня и два ствола
    boss: build(
      [
        { geo: box(0.9, 0.45, 1.2), color: 0x7a1f1f, pos: [0, 0.3, 0] },
        { geo: box(0.6, 0.35, 0.6), color: 0xa32a2a, pos: [0, 0.68, 0], head: true },
        { geo: gunGeo, color: 0x23292f, pos: [-0.15, 0.7, 0.55], head: true },
        { geo: gunGeo, color: 0x23292f, pos: [0.15, 0.7, 0.55], head: true },
      ],
      ENEMY_CAP,
    ),
  }
  const all: Model[] = [
    ...Object.values(towers),
    ...Object.values(ghosts),
    ...Object.values(enemies),
  ]

  /** Подмена примитивов моделями из GLB: те же Model, части корпус/голова заменяются на месте. */
  const applyGlb = (
    model: Model,
    spec: GlbSpec,
    glb: GlbPart[] | undefined,
    mat: MeshLambertMaterial,
  ) => {
    if (!glb) return
    for (const p of model.parts) {
      scene.remove(p.mesh)
      p.mesh.dispose()
    }
    model.parts = glb.map((gp) => {
      const mesh = new InstancedMesh(gp.geo, mat, model.cap)
      mesh.count = 0
      mesh.frustumCulled = false
      scene.add(mesh)
      disposables.push(gp.geo, mesh)
      const local = new Matrix4()
        .makeRotationY(spec.yawFix)
        .multiply(new Matrix4().makeScale(spec.scale, spec.scale, spec.scale))
        .multiply(gp.matrix)
      return {
        mesh,
        local,
        head: HEAD_NODES.has(gp.name),
        leg: gp.name === 'legL' ? 1 : gp.name === 'legR' ? -1 : 0,
      }
    })
  }

  return {
    towers,
    ghosts,
    enemies,
    applyGlbs(loaded: Map<string, GlbPart[]>) {
      const mat = new MeshLambertMaterial({ vertexColors: true })
      disposables.push(mat)
      for (const [k, spec] of Object.entries(TOWER_GLB)) {
        applyGlb(towers[k as TowerType], spec, loaded.get(spec.file), mat)
        applyGlb(ghosts[k as TowerType], spec, loaded.get(spec.file), ghostMat)
      }
      for (const [k, spec] of Object.entries(ENEMY_GLB))
        applyGlb(enemies[k as EnemyType], spec, loaded.get(spec.file), mat)
    },
    begin() {
      for (const m of all) m.n = 0
    },
    /** wx, wy, wz — мировые координаты основания; yaw — корпус, headYaw — голова/башня */
    place(
      m: Model,
      wx: number,
      wy: number,
      wz: number,
      yaw: number,
      headYaw: number,
      k = 1,
      ky = k,
      phase?: number,
    ) {
      if (m.n >= m.cap) return
      _p.set(wx, wy, wz)
      _s.set(k, ky, k)
      _root.compose(_p, _q.setFromAxisAngle(UP, yaw), _s)
      _headM.compose(_p, _q.setFromAxisAngle(UP, headYaw), _s)
      for (const part of m.parts) {
        _m.multiplyMatrices(part.head ? _headM : _root, part.local)
        // качание вокруг бедра (начало узла); без phase ноги стоят
        if (part.leg && phase !== undefined)
          _m.multiply(_swing.makeRotationX(part.leg * LEG_SWING * Math.sin(phase)))
        part.mesh.setMatrixAt(m.n, _m)
      }
      m.n++
    },
    end() {
      for (const m of all)
        for (const part of m.parts) {
          part.mesh.count = m.n
          part.mesh.instanceMatrix.needsUpdate = true
        }
    },
  }
}
