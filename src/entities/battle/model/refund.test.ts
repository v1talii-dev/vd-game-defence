import { describe, expect, it } from 'vitest'
import type { LevelData } from '@/entities/level/@x/battle'
import { FREE_REFUND_SECONDS, TOWERS, buildTicks, upgradeTicks } from '@/entities/tower/@x/battle'
import { TICK_RATE } from '@/shared/config'
import { hashState } from '@/shared/lib/sim'
import { createBattle } from './battle'
import type { BattleEvent } from './types'

const level: LevelData = {
  id: 'test',
  width: 20,
  height: 6,
  path: [
    { x: 0, y: 0.5 },
    { x: 20, y: 0.5 },
  ],
  buildable: Array.from({ length: 20 }, (_, x) => ({ x, y: 1 })),
  spawn: { x: 0, y: 0.5 },
  hq: { x: 20, y: 0.5 },
}
const MG = TOWERS.machineGun.levels[0].cost
const WINDOW = FREE_REFUND_SECONDS * TICK_RATE

function scenario(upgrade = false) {
  const battle = createBattle({ seed: 5, level, startMoney: 5000 })
  const sold: BattleEvent[] = []
  battle.on('towerSold', (e) => sold.push(e))
  battle.dispatch({ type: 'placeTower', towerType: 'machineGun', cell: { x: 3, y: 1 } })
  battle.step(buildTicks('machineGun') + 1)
  const tower = battle.state.towers[0]!
  let invested = MG
  if (upgrade) {
    battle.dispatch({ type: 'upgradeTower', towerId: tower.id })
    battle.step(upgradeTicks('machineGun', 1) + 1)
    invested += TOWERS.machineGun.levels[1].cost
  }
  const sell = () => {
    battle.dispatch({ type: 'sellTower', towerId: tower.id })
    battle.step()
    return (sold[0] as Extract<BattleEvent, { type: 'towerSold' }>).refund
  }
  return { battle, tower, invested, sell }
}

describe('бесплатная отмена', () => {
  it('до первой волны — 100%, в том числе с улучшением', () => {
    expect(scenario().sell()).toBe(MG)
    const s = scenario(true)
    expect(s.tower.sellRefund).toBe(s.invested)
    expect(s.sell()).toBe(s.invested)
  })

  it('в паузе между волнами — 100% даже после окна', () => {
    const s = scenario()
    s.battle.dispatch({ type: 'startWave' })
    s.battle.step(WINDOW + 10)
    expect(s.battle.state.wave.phase).toBe('active')
    s.battle.state.wave.phase = 'prep' // имитация конца волны
    expect(s.sell()).toBe(MG)
  })

  it('во время волны: в окне 100%, после окна 70%', () => {
    const inWin = scenario()
    inWin.battle.dispatch({ type: 'startWave' })
    inWin.battle.step()
    expect(inWin.battle.state.wave.phase).toBe('active')
    expect(inWin.sell()).toBe(MG)

    const late = scenario(true)
    late.battle.dispatch({ type: 'startWave' })
    late.battle.step(WINDOW + 2)
    late.battle.state.wave.phase = 'active' // волну могли уже зачистить — фиксируем фазу
    expect(late.sell()).toBe(Math.floor(late.invested * 0.7))
  })

  it('детерминизм: одинаковый сценарий — одинаковый хеш', () => {
    const a = scenario(true)
    const b = scenario(true)
    a.sell()
    b.sell()
    expect(hashState(a.battle.state)).toBe(hashState(b.battle.state))
  })
})
