import { describe, expect, it } from 'vitest'
import { pickQuality, QUALITY_PROFILES, scaleCount } from './quality'

describe('pickQuality', () => {
  it('десктоп без параметров — high', () => {
    expect(pickQuality({ coarsePointer: false, search: '' }).level).toBe('high')
  })
  it('coarse pointer — low', () => {
    expect(pickQuality({ coarsePointer: true, search: '' }).level).toBe('low')
  })
  it('URL приоритетнее pointer', () => {
    expect(pickQuality({ coarsePointer: false, search: '?quality=low' }).level).toBe('low')
    expect(pickQuality({ coarsePointer: true, search: '?quality=high' }).level).toBe('high')
  })
  it('неизвестное значение игнорируется', () => {
    expect(pickQuality({ coarsePointer: true, search: '?quality=ultra' }).level).toBe('low')
  })
  it('low не тяжелее high', () => {
    const { high, low } = QUALITY_PROFILES
    expect(low.dprCap).toBeLessThanOrEqual(high.dprCap)
    expect(low.particleMul).toBeLessThan(high.particleMul)
    expect(low.maxActiveEffects).toBeLessThan(high.maxActiveEffects)
  })
})

describe('scaleCount', () => {
  it('округляет вверх, не обнуляет ненулевое', () => {
    expect(scaleCount(10, 0.4)).toBe(4)
    expect(scaleCount(1, 0.1)).toBe(1)
    expect(scaleCount(0, 0.5)).toBe(0)
  })
})
