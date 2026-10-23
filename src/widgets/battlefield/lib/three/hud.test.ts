import { describe, expect, it } from 'vitest'
import { UPGRADE_COLOR, writeProgress } from './hud'

describe('writeProgress', () => {
  it('пишет прогресс и цвет, зажимая прогресс', () => {
    const a = new Float32Array(8)
    writeProgress(a, 1, 1.5, UPGRADE_COLOR)
    expect(a[4]).toBe(1)
    expect(a[5]).toBeCloseTo(0x4a / 255)
    expect(a[7]).toBeCloseTo(1)
    writeProgress(a, 0, -1, 0)
    expect(a[0]).toBe(0)
  })
})
