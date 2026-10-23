import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useProgressStore } from './progressStore'

describe('progressStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('разблокировки выводятся из levels', () => {
    const p = useProgressStore()
    expect(p.isUnlocked('desert-base')).toBe(true)
    expect(p.isUnlocked('stub-2')).toBe(false)
    expect(p.isUnlocked('нет-такого')).toBe(false)
    p.recordResult('desert-base', 1, 10, 900)
    expect(p.isUnlocked('stub-2')).toBe(true)
    expect(p.levels['desert-base']?.bestTick).toBe(900)
    expect(Array.isArray(p.unlockedTowers)).toBe(true)
  })
})
