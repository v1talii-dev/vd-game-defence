import { describe, expect, it } from 'vitest'
import { createBattle } from '@/entities/battle'
import { loadDesertBase } from '../helpers/level'
import { MACHINE_GUNS_ONLY, REFERENCE, runBot, runRandomBot } from './bot'

const level = loadDesertBase()

describe('баланс (SPEC §6.4)', () => {
  it('без башен — поражение не позже волны 3', () => {
    const battle = createBattle({ seed: 1, level })
    while (!battle.state.outcome) battle.step(30)
    expect(battle.state.outcome).toEqual({ result: 'defeat' })
    expect(battle.state.wave.number).toBeLessThanOrEqual(3)
  })

  it('эталонная расстановка побеждает с HP ≥ 10', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const battle = runBot(level, REFERENCE, seed)
      expect(battle.state.outcome?.result).toBe('victory')
      expect(battle.state.hqHp).toBeGreaterThanOrEqual(10)
      expect(battle.state.hqHp).toBeLessThan(20)
    }
  })

  it('только пулемёты — поражение на волне с дронами и танками', () => {
    const battle = runBot(level, MACHINE_GUNS_ONLY)
    expect(battle.state.outcome?.result).toBe('defeat')
    expect(battle.state.wave.number).toBeGreaterThanOrEqual(5)
    expect(battle.state.wave.number).toBeLessThanOrEqual(10)
  })

  it('50 случайных ботов — доля побед 20–80%', () => {
    let wins = 0
    for (let seed = 1; seed <= 50; seed++) {
      if (runRandomBot(level, seed).state.outcome?.result === 'victory') wins++
    }
    expect(wins / 50).toBeGreaterThanOrEqual(0.2)
    expect(wins / 50).toBeLessThanOrEqual(0.8)
  })
})
