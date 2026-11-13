import {
  Color,
  DataTexture,
  MeshBasicMaterial,
  PlaneGeometry,
  ShaderMaterial,
  type Scene,
} from 'three'
import {
  BatchedRenderer,
  Bezier,
  ColorOverLife,
  ConstantColor,
  ConstantValue,
  Gradient,
  Matrix4,
  ParticleSystem,
  PiecewiseBezier,
  PointEmitter,
  RenderMode,
  SizeOverLife,
  Vector3,
  Vector4,
} from 'three.quarks'
import { scaleCount, type QualityProfile } from '@/shared/lib/three'

export type FxKind = 'flash' | 'explosion' | 'spark' | 'puff' | 'done' | 'flame'

const PRESETS = {
  flash: { color: 0xfff2a0, size: 0.18, growth: 2, life: 0.11, speed: 0, count: 1, alpha: 1 },
  explosion: {
    color: 0xff8a2a,
    size: 0.3,
    growth: 4,
    life: 0.42,
    speed: 0.7,
    count: 8,
    alpha: 0.95,
  },
  spark: { color: 0xffe08a, size: 0.09, growth: 0.4, life: 0.16, speed: 1.1, count: 3, alpha: 1 },
  puff: { color: 0xc8c8c8, size: 0.14, growth: 3, life: 0.65, speed: 0.08, count: 1, alpha: 0.35 },
  done: {
    color: 0x8dff9c,
    size: 0.09,
    growth: 1.6,
    life: 0.45,
    speed: 0.7,
    count: 16,
    alpha: 0.75,
  },
  flame: { color: 0xffa32b, size: 0.12, growth: 2, life: 0.3, speed: 0.6, count: 4, alpha: 0.7 },
}

export function createEffects(scene: Scene, quality: QualityProfile) {
  const batch = new BatchedRenderer()
  // A radial sprite avoids opaque smoke quads without a downloaded texture.
  const pixels = new Uint8Array(32 * 32 * 4)
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const i = (y * 32 + x) * 4
      pixels.fill(255, i, i + 3)
      pixels[i + 3] = Math.round(
        255 * Math.max(0, 1 - Math.hypot((x - 15.5) / 15.5, (y - 15.5) / 15.5)) ** 2,
      )
    }
  }
  const texture = new DataTexture(pixels, 32, 32)
  texture.needsUpdate = true
  const material = new MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false })
  const geometry = new PlaneGeometry(1, 1)
  const systems = new Map<FxKind, ParticleSystem>()
  const spawned: Record<FxKind, number> = {
    flash: 0,
    explosion: 0,
    spark: 0,
    puff: 0,
    done: 0,
    flame: 0,
  }
  scene.add(batch)
  for (const kind of Object.keys(PRESETS) as FxKind[]) {
    const p = PRESETS[kind]
    const color = new Color(p.color)
    const system = new ParticleSystem({
      material,
      instancingGeometry: geometry,
      renderMode: RenderMode.BillBoard,
      looping: true,
      autoDestroy: false,
      duration: 1,
      shape: new PointEmitter(),
      startLife: new ConstantValue(p.life),
      startSpeed: new ConstantValue(p.speed),
      startSize: new ConstantValue(p.size),
      startColor: new ConstantColor(new Vector4(color.r, color.g, color.b, p.alpha)),
      emissionOverTime: new ConstantValue(0),
      emissionOverDistance: new ConstantValue(0),
      behaviors: [
        new ColorOverLife(
          new Gradient(
            [[new Vector3(1, 1, 1), 0]],
            [
              [1, 0],
              [0, 1],
            ],
          ),
        ),
        new SizeOverLife(
          new PiecewiseBezier([
            [new Bezier(1, 1 + (p.growth - 1) / 3, 1 + (2 * (p.growth - 1)) / 3, p.growth), 0],
          ]),
        ),
      ],
      worldSpace: true,
    })
    scene.add(system.emitter)
    batch.addSystem(system)
    systems.set(kind, system)
  }
  // Settle Quarks' initial batch registration before advancing live particles.
  batch.update(0)
  for (const b of batch.batches) {
    if (b.material instanceof ShaderMaterial) {
      // Quarks omits output conversion; Three selects the render target's color space.
      b.material.fragmentShader = b.material.fragmentShader.replace(
        '#include <tonemapping_fragment>',
        '#include <tonemapping_fragment>\n#include <colorspace_fragment>',
      )
    }
  }
  const matrix = new Matrix4()
  let disposed = false
  const particleCount = () => [...systems.values()].reduce((sum, s) => sum + s.particleNum, 0)

  return {
    state: () => ({
      particles: particleCount(),
      systems: batch.systemToBatchIndex.size,
      spawned: { ...spawned },
    }),
    spawn(kind: FxKind, x: number, y: number, z: number) {
      if (disposed) return
      const system = systems.get(kind)!
      const p = PRESETS[kind]
      const mul = kind === 'flash' ? quality.flashMul : quality.particleMul
      const count = Math.min(scaleCount(p.count, mul), quality.maxActiveEffects - particleCount())
      if (count <= 0) return
      matrix.makeTranslation(x, y, z)
      // Emit immediately at the event position without replacing existing particles.
      system.emissionState.waitEmiting = count
      system.emit(0, system.emissionState, matrix)
      spawned[kind]++
    },
    update(dtMs: number) {
      if (disposed || dtMs < 0) return
      if (dtMs === 0) {
        // Debug stepping can spawn effects on pause; upload them without advancing time.
        for (const b of batch.batches) b.update()
        return
      }
      // Quarks clamps an update to 0.1s; substeps preserve the scaled battle time.
      let remaining = Math.min(dtMs / 1000, 0.8)
      while (remaining > 0) {
        const step = Math.min(remaining, 0.1)
        batch.update(step)
        remaining -= step
      }
    },
    dispose() {
      if (disposed) return
      disposed = true
      for (const system of systems.values()) {
        system.stop()
        system.dispose()
      }
      for (const b of batch.batches) {
        b.dispose()
        for (const m of Array.isArray(b.material) ? b.material : [b.material]) m.dispose()
        b.settings.material.dispose()
      }
      batch.removeFromParent()
      geometry.dispose()
      material.dispose()
      texture.dispose()
    },
  }
}
