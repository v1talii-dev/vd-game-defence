import { describe, expect, it } from 'vitest'
import { createBattle } from '@/entities/battle'
import { loadDesertBase } from '../helpers/level'
import { REFERENCE, runBot } from './bot'

const level = loadDesertBase()

describe('баланс (SPEC §6.4)', () => {
  it('без башен — поражение не позже волны 3', () => {
    const battle = createBattle({ seed: 1, level })
    while (!battle.state.outcome) battle.step(30)
    expect(battle.state.outcome).toEqual({ result: 'defeat' })
    expect(battle.state.wave.number).toBeLessThanOrEqual(3)
  })

  it('эталонная расстановка побеждает с HP ≥ 10', () => {
    const battle = runBot(level, REFERENCE)
    expect(battle.state.outcome?.result).toBe('victory')
    expect(battle.state.hqHp).toBeGreaterThanOrEqual(10)
  })
})
