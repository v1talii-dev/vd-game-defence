import { beforeEach, expect, it, vi } from 'vitest'
import { PerspectiveCamera, Scene, type WebGLRenderer } from 'three'
import { QUALITY_PROFILES } from '@/shared/lib/three'
import { createBattleFrame } from './frame'

const state = vi.hoisted(() => ({
  passes: [] as { dispose(): void }[],
  render: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
  quadDispose: vi.fn(),
  config: { gammaCorrection: true, aoRadius: 0, intensity: 0 },
}))
vi.mock('n8ao', () => ({
  N8AOPostPass: class {
    configuration = state.config
    copyQuad = { dispose: state.quadDispose }
    accumulationQuad = { dispose: state.quadDispose }
    depthCopyPass = { dispose: state.quadDispose }
    depthDownsampleQuad = { dispose: state.quadDispose }
    effectCompositerQuad = { dispose: state.quadDispose }
    effectShaderQuad = { dispose: state.quadDispose }
    poissonBlurQuad = { dispose: state.quadDispose }
    dispose() {
      state.dispose()
    }
  },
}))
vi.mock('postprocessing', () => ({
  EffectComposer: class {
    addPass(pass: { dispose(): void }) {
      state.passes.push(pass)
    }
    render = state.render
    setSize = state.resize
    dispose() {
      for (const p of state.passes) p.dispose()
    }
  },
  RenderPass: class {
    dispose() {}
  },
  EffectPass: class {
    dispose() {}
  },
  SMAAEffect: class {},
  SMAAPreset: { HIGH: 2 },
}))
beforeEach(() => {
  state.passes.length = 0
  vi.clearAllMocks()
})

it.each(['high', 'low'] as const)(
  '%s owns the whole frame reset, DPR/resize and cleanup',
  (level) => {
    const renderer = {
      info: { autoReset: true, reset: vi.fn() },
      render: vi.fn(),
      setSize: vi.fn(),
      setPixelRatio: vi.fn(),
    }
    const frame = createBattleFrame(
      renderer as unknown as WebGLRenderer,
      new Scene(),
      new PerspectiveCamera(),
      QUALITY_PROFILES[level],
    )
    expect(renderer.info.autoReset).toBe(false)
    expect(state.passes.map((p) => p.constructor.name)).toEqual(
      level === 'high' ? ['RenderPass', 'BattleAOPass', 'EffectPass'] : [],
    )
    frame.resize(800, 600, 3)
    expect(renderer.setPixelRatio).toHaveBeenCalledWith(level === 'high' ? 2 : 1.5)
    expect(renderer.setSize).toHaveBeenCalledWith(800, 600)
    frame.render(0.02)
    expect(renderer.info.reset).toHaveBeenCalledTimes(1)
    if (level === 'high') {
      expect(state.config.gammaCorrection).toBe(false)
      expect(state.render).toHaveBeenCalledWith(0.02)
      expect(renderer.info.reset.mock.invocationCallOrder[0]).toBeLessThan(
        state.render.mock.invocationCallOrder[0]!,
      )
      expect(state.resize).toHaveBeenCalledWith(800, 600)
      expect(renderer.render).not.toHaveBeenCalled()
    } else {
      expect(renderer.render).toHaveBeenCalledTimes(1)
      expect(state.render).not.toHaveBeenCalled()
    }
    frame.dispose()
    frame.dispose()
    expect(state.dispose).toHaveBeenCalledTimes(level === 'high' ? 1 : 0)
    expect(state.quadDispose).toHaveBeenCalledTimes(level === 'high' ? 7 : 0)
  },
)
