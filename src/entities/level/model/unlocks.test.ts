import { describe, expect, it } from 'vitest'
import { LEVELS, getLevel } from '../config/levels'
import { isLevelUnlocked, unlockedTowers } from './unlocks'

describe('реестр уровней', () => {
  it('getLevel: известный id и ошибка на неизвестном', () => {
    expect(getLevel('desert-base').implemented).toBe(true)
    expect(getLevel('stub-2').implemented).toBe(false)
    expect(() => getLevel('нет-такого')).toThrow()
  })

  it('id уникальны, allowedTowers не пуст', () => {
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(LEVELS.length)
    for (const l of LEVELS) expect(l.allowedTowers.length).toBeGreaterThan(0)
  })
})

describe('isLevelUnlocked', () => {
  it('без requires открыт всегда', () => {
    expect(isLevelUnlocked(getLevel('desert-base'), {})).toBe(true)
  })
  it('с requires: 0 звёзд — закрыт, 1 — открыт', () => {
    const stub = getLevel('stub-2')
    expect(isLevelUnlocked(stub, {})).toBe(false)
    expect(isLevelUnlocked(stub, { 'desert-base': { stars: 0 } })).toBe(false)
    expect(isLevelUnlocked(stub, { 'desert-base': { stars: 1 } })).toBe(true)
  })
})

describe('unlockedTowers', () => {
  it('в M12 unlocks пуст — обе башни доступны', () => {
    expect(unlockedTowers({})).toEqual(['machineGun', 'rocket'])
  })
})
