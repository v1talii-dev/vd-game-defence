import type { World } from '@dimforge/rapier3d-compat'
import type { QualityProfile } from '@/shared/lib/three'

// init is shared; each battle owns (and frees) its own WASM world.
let rapierReady: Promise<typeof import('@dimforge/rapier3d-compat')> | undefined

export function createVisualWorld(quality: QualityProfile) {
  let disposed = false
  let world: World | undefined
  const ready =
    quality.level === 'low'
      ? Promise.resolve()
      : (rapierReady ??= import('@dimforge/rapier3d-compat').then(async (rapier) => {
          await rapier.init()
          return rapier
        })).then((rapier) => {
          if (disposed) return
          // ponytail: S1 compatibility proof only; bodies and stepping belong to S4.
          world = new rapier.World({ x: 0, y: -9.81, z: 0 })
        })
  return {
    ready,
    isReady: () => world !== undefined,
    dispose() {
      disposed = true
      world?.free()
      world = undefined
    },
  }
}
