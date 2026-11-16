import type { World, RigidBody } from '@dimforge/rapier3d-compat'
import {
  BoxGeometry,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Scene,
  Vector3,
} from 'three'
import type { QualityProfile } from '@/shared/lib/three'
import { createVisualTimestep } from './visualTimestep'

// init is shared; each battle owns (and frees) its own WASM world.
let rapierReady: Promise<typeof import('@dimforge/rapier3d-compat')> | undefined

export function createVisualWorld(quality: QualityProfile, scene?: Scene) {
  let disposed = false
  let world: World | undefined
  let api: typeof import('@dimforge/rapier3d-compat') | undefined
  const pieces: { body: RigidBody; age: number }[] = []
  const pending: { x: number; y: number; z: number }[] = []
  const mesh =
    scene && quality.level === 'high'
      ? new InstancedMesh(
          new BoxGeometry(0.2, 0.2, 0.2),
          new MeshStandardMaterial({ color: 0x716b5b }),
          32,
        )
      : undefined
  if (mesh) {
    mesh.count = 0
    mesh.frustumCulled = false
    scene?.add(mesh)
  }
  const matrix = new Matrix4(),
    position = new Vector3(),
    rotation = new Quaternion(),
    scale = new Vector3(1, 1, 1)
  const advance = createVisualTimestep()
  function spawn(x: number, y: number, z: number) {
    if (disposed || quality.level === 'low') return
    if (!world || !api) {
      if (pending.length < 8) pending.push({ x, y, z })
      return
    }
    for (let i = 0; i < 6 && pieces.length < 32; i++) {
      const angle = (i * Math.PI) / 3
      const body = world.createRigidBody(
        api.RigidBodyDesc.dynamic()
          .setTranslation(x + Math.cos(angle) * 0.18, y, z + Math.sin(angle) * 0.18)
          .setLinvel(Math.cos(angle) * 2, 2 + i * 0.2, Math.sin(angle) * 2)
          .setAngvel({ x: i + 1, y: 2, z: 3 }),
      )
      world.createCollider(api.ColliderDesc.cuboid(0.1, 0.1, 0.1), body)
      pieces.push({ body, age: 0 })
    }
  }
  const ready =
    quality.level === 'low'
      ? Promise.resolve()
      : (rapierReady ??= import('@dimforge/rapier3d-compat').then(async (rapier) => {
          await rapier.init()
          return rapier
        })).then((rapier) => {
          if (disposed) return
          api = rapier
          world = new rapier.World({ x: 0, y: -9.81, z: 0 })
          world.createCollider(rapier.ColliderDesc.cuboid(100, 0.1, 100).setTranslation(0, -0.1, 0))
          for (const p of pending) spawn(p.x, p.y, p.z)
          pending.length = 0
        })
  return {
    ready,
    isReady: () => world !== undefined,
    count: () => pieces.length,
    spawn,
    update(dt: number) {
      if (!world || !mesh) return
      if (pieces.length === 0) return
      const activeWorld = world
      advance(dt, (step) => {
        activeWorld.timestep = step
        activeWorld.step()
        for (const piece of pieces) piece.age += step
      })
      for (let i = pieces.length - 1; i >= 0; i--) {
        const piece = pieces[i]!
        if (piece.age >= 3) {
          world.removeRigidBody(piece.body)
          pieces.splice(i, 1)
        }
      }
      pieces.forEach(({ body }, i) => {
        const p = body.translation(),
          q = body.rotation()
        mesh.setMatrixAt(
          i,
          matrix.compose(position.set(p.x, p.y, p.z), rotation.set(q.x, q.y, q.z, q.w), scale),
        )
      })
      mesh.count = pieces.length
      mesh.instanceMatrix.needsUpdate = true
    },
    dispose() {
      if (disposed) return
      disposed = true
      pending.length = 0
      world?.free()
      world = undefined
      pieces.length = 0
      if (mesh) {
        scene?.remove(mesh)
        mesh.geometry.dispose()
        mesh.material.dispose()
        mesh.dispose()
      }
    },
  }
}
