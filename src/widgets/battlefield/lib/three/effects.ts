// Пул эффектов: вспышка выстрела, взрыв, искра попадания, дымок следа ракеты.
// Один InstancedMesh на все эффекты: draw calls не растут с их числом.
import {
  Color,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  SphereGeometry,
  type Scene,
} from 'three'

type Disposables = { dispose(): void }[]
export type FxKind = 'flash' | 'explosion' | 'spark' | 'puff' | 'done'

interface FxParams {
  color: number
  from: number
  to: number
  durMs: number
  opacity: number
}

const PARAMS: Record<FxKind, FxParams> = {
  flash: { color: 0xfff2a0, from: 0.1, to: 0.3, durMs: 110, opacity: 1 },
  explosion: { color: 0xff8a2a, from: 0.15, to: 0.8, durMs: 420, opacity: 0.95 },
  spark: { color: 0xffe08a, from: 0.05, to: 0.2, durMs: 160, opacity: 1 },
  done: { color: 0xfff6c0, from: 0.2, to: 1.1, durMs: 350, opacity: 0.8 },
  puff: { color: 0xc8c8c8, from: 0.07, to: 0.2, durMs: 650, opacity: 0.55 },
}

interface Fx {
  kind: FxKind
  age: number
  active: boolean
  x: number
  y: number
  z: number
}

export function createEffects(scene: Scene, disposables: Disposables, size = 128) {
  const geo = new SphereGeometry(1, 10, 8)
  const mat = new MeshBasicMaterial({ transparent: true, depthWrite: false })
  // прозрачность на экземпляр: свой атрибут + правка шейдера
  const alphaAttr = new InstancedBufferAttribute(new Float32Array(size), 1).setUsage(
    DynamicDrawUsage,
  )
  geo.setAttribute('aAlpha', alphaAttr)
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace(
      'void main() {',
      'attribute float aAlpha;\nvarying float vAlpha;\nvoid main() {\nvAlpha = aAlpha;',
    )
    sh.fragmentShader = sh.fragmentShader
      .replace('void main() {', 'varying float vAlpha;\nvoid main() {')
      .replace(
        '#include <opaque_fragment>',
        'diffuseColor.a *= vAlpha;\n#include <opaque_fragment>',
      )
  }
  const mesh = new InstancedMesh(geo, mat, size)
  mesh.instanceMatrix.setUsage(DynamicDrawUsage)
  mesh.frustumCulled = false
  mesh.count = 0
  scene.add(mesh)
  disposables.push(geo, mat, mesh)
  const pool: Fx[] = Array.from({ length: size }, () => ({
    kind: 'flash',
    age: 0,
    active: false,
    x: 0,
    y: 0,
    z: 0,
  }))
  const m = new Matrix4()
  const c = new Color()

  return {
    /** позиция — в мировых координатах */
    spawn(kind: FxKind, wx: number, wy: number, wz: number) {
      const fx = pool.find((f) => !f.active)
      if (!fx) return
      fx.active = true
      fx.kind = kind
      fx.age = 0
      fx.x = wx
      fx.y = wy
      fx.z = wz
    },
    update(dtMs: number) {
      let n = 0
      for (const fx of pool) {
        if (!fx.active) continue
        fx.age += dtMs
        const p = PARAMS[fx.kind]
        const k = fx.age / p.durMs
        if (k >= 1) {
          fx.active = false
          continue
        }
        const s = p.from + (p.to - p.from) * k
        mesh.setMatrixAt(n, m.makeScale(s, s, s).setPosition(fx.x, fx.y, fx.z))
        mesh.setColorAt(n, c.setHex(p.color))
        alphaAttr.setX(n, p.opacity * (1 - k))
        n++
      }
      mesh.count = n
      mesh.instanceMatrix.needsUpdate = alphaAttr.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    },
  }
}
