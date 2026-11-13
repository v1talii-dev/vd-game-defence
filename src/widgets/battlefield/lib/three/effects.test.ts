import { describe, expect, it, vi } from 'vitest'
import { InstancedBufferGeometry, MeshBasicMaterial, Scene, ShaderMaterial } from 'three'
import { BatchedRenderer, ParticleEmitter, type ParticleSystem } from 'three.quarks'
import { QUALITY_PROFILES } from '@/shared/lib/three'
import { createEffects, type FxKind } from './effects'

function setup(level: 'high' | 'low' = 'high') {
  const scene = new Scene()
  const fx = createEffects(scene, QUALITY_PROFILES[level])
  const systems = scene.children
    .filter((c) => c instanceof ParticleEmitter)
    .map((e) => (e as ParticleEmitter).system as ParticleSystem)
  const batch = scene.children.find((c) => c instanceof BatchedRenderer) as BatchedRenderer
  return { scene, fx, systems, batch }
}

describe('Quarks battle effects', () => {
  it.each(['high', 'low'] as const)(
    'caps mixed %s effects and reuses particles in one batch',
    (level) => {
      const { scene, fx, systems, batch } = setup(level)
      const kinds: FxKind[] = ['flash', 'explosion', 'spark', 'puff', 'done', 'flame']
      for (let round = 0; round < 3; round++) {
        for (let i = 0; i < 200; i++) fx.spawn(kinds[i % kinds.length]!, i, 1, 2)
        expect(fx.state().particles).toBe(QUALITY_PROFILES[level].maxActiveEffects)
        expect(batch.batches).toHaveLength(1)
        expect(fx.state().systems).toBe(6)
        expect(scene.children).toHaveLength(7)
        const allocated = systems.map((s) => [...s.particles])
        fx.update(800)
        expect(fx.state().particles).toBe(0)
        for (let i = 0; i < 100; i++) fx.spawn(kinds[i % kinds.length]!, i, 1, 2)
        systems.forEach((s, i) =>
          expect(s.particles.every((p) => allocated[i]!.includes(p))).toBe(true),
        )
        fx.update(800)
      }
      fx.dispose()
    },
  )

  it('keeps overlapping event positions, scales time, fades and pauses', () => {
    const { fx, systems } = setup()
    fx.spawn('done', 1, 2, 3)
    fx.spawn('done', 10, 20, 30)
    const system = systems[4]!
    expect(system.particleNum).toBe(32)
    expect(system.particles[0]!.position.x).toBeCloseTo(1, 0)
    expect(system.particles[16]!.position.x).toBeCloseTo(10, 0)
    const particle = system.particles[0]!
    fx.update(0)
    expect(particle.age).toBe(0)
    fx.update(200)
    expect(particle.age).toBeCloseTo(0.2)
    expect(particle.color.w).toBeLessThan(particle.startColor.w)
    fx.update(0)
    expect(particle.age).toBeCloseTo(0.2)
    fx.update(400)
    expect(fx.state().particles).toBe(0)
    expect(fx.state().spawned.done).toBe(2)
    fx.dispose()
  })

  it('releases emitters and batch resources exactly once', () => {
    const { scene, fx, batch } = setup()
    const b = batch.batches[0]!
    const material = Array.isArray(b.material) ? b.material[0]! : b.material
    const source = b.settings.material as MeshBasicMaterial
    const spies = [
      vi.spyOn(b, 'dispose'),
      vi.spyOn(material, 'dispose'),
      vi.spyOn(b.settings.material, 'dispose'),
      vi.spyOn(source.map!, 'dispose'),
      vi.spyOn(b.settings.instancingGeometry, 'dispose'),
    ]
    fx.spawn('explosion', 0, 0, 0)
    fx.dispose()
    fx.dispose()
    fx.spawn('done', 0, 0, 0)
    fx.update(100)
    expect(scene.children).toHaveLength(0)
    expect(fx.state().particles).toBe(0)
    expect(fx.state().systems).toBe(0)
    spies.forEach((spy) => expect(spy).toHaveBeenCalledTimes(1))
  })

  it('uses translucent smoke and a single target-aware output color conversion', () => {
    const { fx, batch, systems } = setup()
    const material = batch.batches[0]!.material as ShaderMaterial
    expect(material.fragmentShader.match(/#include <colorspace_fragment>/g)).toHaveLength(1)
    expect(material.depthWrite).toBe(false)
    expect(material.depthTest).toBe(true)
    fx.spawn('puff', 0, 0, 0)
    expect(systems[3]!.particles[0]!.color.w).toBe(0.35)
    fx.dispose()
  })

  it('provides a bounded flame preset without connecting gameplay', () => {
    const { fx } = setup()
    fx.spawn('flame', 0, 0, 0)
    expect(fx.state().particles).toBe(4)
    expect(fx.state().spawned.flame).toBe(1)
    fx.update(400)
    expect(fx.state().particles).toBe(0)
    fx.dispose()
  })

  it('uploads effects spawned by paused debug steps without advancing their age', () => {
    const { fx, batch, systems } = setup()
    const geometry = batch.batches[0]!.geometry
    if (!(geometry instanceof InstancedBufferGeometry))
      throw new Error('Expected instanced particles')
    fx.spawn('done', 1, 2, 3)
    fx.update(0)
    expect(geometry.instanceCount).toBe(16)
    expect(systems[4]!.particles[0]!.age).toBe(0)
    fx.spawn('flash', 4, 5, 6)
    fx.update(0)
    expect(geometry.instanceCount).toBe(17)
    expect(systems[0]!.particles[0]!.age).toBe(0)
    expect(systems[4]!.particles[0]!.age).toBe(0)
    fx.dispose()
  })
})
