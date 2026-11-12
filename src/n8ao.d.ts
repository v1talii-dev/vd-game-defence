declare module 'n8ao' {
  import { Pass } from 'postprocessing'
  import type { Camera, Scene } from 'three'

  // Installed 2.0.1 has no declarations; only the API used by battlefield is described.
  export class N8AOPostPass extends Pass {
    constructor(scene: Scene, camera: Camera, width?: number, height?: number)
    configuration: {
      gammaCorrection: boolean
      aoRadius: number
      intensity: number
    }
    // 2.0.1 inherits Pass.dispose, which misses these non-Three fullscreen wrappers.
    accumulationQuad?: { dispose(): void }
    copyQuad?: { dispose(): void }
    depthCopyPass?: { dispose(): void } | null
    depthDownsampleQuad?: { dispose(): void }
    effectCompositerQuad?: { dispose(): void }
    effectShaderQuad?: { dispose(): void }
    poissonBlurQuad?: { dispose(): void }
  }
}
