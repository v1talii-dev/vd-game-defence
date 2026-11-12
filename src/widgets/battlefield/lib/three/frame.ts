import { HalfFloatType, type Camera, type Scene, type WebGLRenderer } from 'three'
import { EffectComposer, EffectPass, RenderPass, SMAAEffect, SMAAPreset } from 'postprocessing'
import { N8AOPostPass } from 'n8ao'
import type { QualityProfile } from '@/shared/lib/three'

class BattleAOPass extends N8AOPostPass {
  override dispose() {
    this.accumulationQuad?.dispose()
    this.copyQuad?.dispose()
    this.depthCopyPass?.dispose()
    this.depthDownsampleQuad?.dispose()
    this.effectCompositerQuad?.dispose()
    this.effectShaderQuad?.dispose()
    this.poissonBlurQuad?.dispose()
    super.dispose() // targets, noise texture and standalone materials
  }
}

export function createBattleFrame(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: Camera,
  quality: QualityProfile,
) {
  renderer.info.autoReset = false
  let composer: EffectComposer | undefined
  if (quality.level === 'high') {
    composer = new EffectComposer(renderer, { multisampling: 0, frameBufferType: HalfFloatType })
    const ao = new BattleAOPass(scene, camera)
    ao.configuration.aoRadius = 0.5 // one tile = one world unit
    ao.configuration.intensity = 1
    // Final EffectPass performs the sole linear -> sRGB transform; no tone mapping.
    ao.configuration.gammaCorrection = false
    composer.addPass(new RenderPass(scene, camera))
    composer.addPass(ao)
    composer.addPass(new EffectPass(camera, new SMAAEffect({ preset: SMAAPreset.HIGH })))
  }
  return {
    render(seconds: number) {
      // N8AO renders internally several times: reset exactly once, before the whole frame.
      renderer.info.reset()
      if (composer) composer.render(seconds)
      else renderer.render(scene, camera)
    },
    resize(width: number, height: number, devicePixelRatio: number) {
      renderer.setPixelRatio(Math.min(devicePixelRatio, quality.dprCap))
      renderer.setSize(width, height)
      // composer reads renderer DPR and resizes every pass (including AO) in physical pixels.
      composer?.setSize(width, height)
    },
    dispose() {
      composer?.dispose()
      composer = undefined
    },
  }
}
