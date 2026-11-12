import { describe, expect, it, vi } from 'vitest'
import { Scene } from 'three'
import { BatchedRenderer, ParticleEmitter, type ParticleSystem } from 'three.quarks'
import { QUALITY_PROFILES } from '@/shared/lib/three'
import { createDoneEffect } from './doneEffect'

describe('S1 completion emitter', () => {
  it.each(['high', 'low'] as const)(
    'reuses one bounded %s burst, pauses and frees its batch',
    (level) => {
      const scene = new Scene()
      const quality = QUALITY_PROFILES[level]
      const fx = createDoneEffect(scene, quality)
      const emitter = scene.children.find((c) => c instanceof ParticleEmitter) as ParticleEmitter
      const system = emitter.system as ParticleSystem
      const batch = scene.children.find((c) => c instanceof BatchedRenderer) as BatchedRenderer
      const expectedCount = level === 'high' ? 16 : 7
      for (let i = 0; i < 100; i++) {
        fx.spawn(i, 1, 2)
        fx.update(0.01)
        expect(system.particleNum).toBe(expectedCount)
        expect(system.particleNum).toBeLessThanOrEqual(quality.maxActiveEffects)
      }
      expect(scene.children).toHaveLength(2)
      expect(batch.systemToBatchIndex.size).toBe(1)
      const age = system.particles[0]!.age
      fx.update(0)
      expect(system.particles[0]!.age).toBe(age)
      fx.update(0.2) // scaled seconds from the existing RAF, not clamped to 0.1 by Quarks
      expect(system.particles[0]!.age).toBeCloseTo(age + 0.2)
      const geometryDispose = vi.spyOn(batch.batches[0]!.geometry, 'dispose')
      const material = batch.batches[0]!.material
      const materialDispose = vi.spyOn(Array.isArray(material) ? material[0]! : material, 'dispose')
      fx.update(0.8)
      expect(system.particleNum).toBe(0)
      fx.dispose()
      fx.dispose()
      fx.spawn(0, 0, 0)
      fx.update(0.1)
      expect(scene.children).toHaveLength(0)
      expect(batch.systemToBatchIndex.size).toBe(0)
      expect(geometryDispose).toHaveBeenCalledTimes(1)
      expect(materialDispose).toHaveBeenCalledTimes(1)
    },
  )
})
