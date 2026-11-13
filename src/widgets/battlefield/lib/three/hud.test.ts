import { describe, expect, it } from 'vitest'
import { Color, PerspectiveCamera, Scene, Mesh, ShaderMaterial } from 'three'
import { createHud, UPGRADE_COLOR, writeProgress } from './hud'

describe('writeProgress', () => {
  it('пишет прогресс и цвет, зажимая прогресс', () => {
    const a = new Float32Array(8)
    writeProgress(a, 1, 1.5, UPGRADE_COLOR)
    expect(a[4]).toBe(1)
    const linear = new Color(UPGRADE_COLOR)
    expect(a[5]).toBeCloseTo(linear.r)
    expect(a[6]).toBeCloseTo(linear.g)
    expect(a[7]).toBeCloseTo(1)
    writeProgress(a, 0, -1, 0)
    expect(a[0]).toBe(0)
  })
})

it('HUD does not write depth or receive AO; progress supports screen color conversion', () => {
  const scene = new Scene()
  const disposables: { dispose(): void }[] = []
  createHud(scene, new PerspectiveCamera(), disposables)
  for (const object of scene.children) {
    expect(object).toBeInstanceOf(Mesh)
    const material = (object as Mesh).material
    expect(Array.isArray(material)).toBe(false)
    if (Array.isArray(material)) throw new Error('Expected one HUD material')
    expect(material.transparent).toBe(true)
    expect(material.depthWrite).toBe(false)
    if (material instanceof ShaderMaterial) {
      expect(material.fragmentShader).toContain('#include <colorspace_fragment>')
    }
  }
  for (const disposable of disposables) disposable.dispose()
})
