import { MeshBasicMaterial, PlaneGeometry, type Scene } from 'three'
import { BatchedRenderer, ConstantValue, ParticleSystem, RenderMode } from 'three.quarks'
import { scaleCount, type QualityProfile } from '@/shared/lib/three'

export function createDoneEffect(scene: Scene, quality: QualityProfile) {
  const batch = new BatchedRenderer()
  const material = new MeshBasicMaterial({
    color: 0x8dff9c,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
  })
  const geometry = new PlaneGeometry(1, 1)
  const system = new ParticleSystem({
    material,
    instancingGeometry: geometry,
    renderMode: RenderMode.BillBoard,
    looping: false,
    autoDestroy: false,
    duration: 0.1,
    startLife: new ConstantValue(0.45),
    startSpeed: new ConstantValue(0.7),
    startSize: new ConstantValue(0.09),
    emissionOverTime: new ConstantValue(0),
    emissionBursts: [
      {
        time: 0,
        count: new ConstantValue(
          Math.min(quality.maxActiveEffects, scaleCount(16, quality.particleMul)),
        ),
        cycle: 1,
        interval: 0,
        probability: 1,
      },
    ],
    worldSpace: true,
  })
  scene.add(batch, system.emitter)
  batch.addSystem(system)
  system.pause()
  let disposed = false
  return {
    state: () => ({ particles: system.particleNum, systems: batch.systemToBatchIndex.size }),
    spawn(x: number, y: number, z: number) {
      if (disposed) return
      // ponytail: one reusable emitter, newest completion replaces the previous burst.
      // S3 can pool simultaneous bursts inside the shared profile budget.
      system.restart()
      system.emitter.position.set(x, y, z)
      system.emitter.updateWorldMatrix(true, false)
    },
    update(seconds: number) {
      if (disposed || seconds <= 0) return
      // Quarks clamps each update to 0.1s; substeps preserve x2/x8 visual time.
      let remaining = Math.min(seconds, 0.8)
      while (remaining > 0) {
        const step = Math.min(remaining, 0.1)
        batch.update(step)
        remaining -= step
      }
    },
    dispose() {
      if (disposed) return
      disposed = true
      system.dispose()
      for (const b of batch.batches) {
        b.dispose()
        for (const m of Array.isArray(b.material) ? b.material : [b.material]) m.dispose()
      }
      batch.removeFromParent()
      geometry.dispose()
      material.dispose()
    },
  }
}
