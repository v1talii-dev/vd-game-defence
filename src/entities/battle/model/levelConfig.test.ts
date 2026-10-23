import { describe, expect, it } from 'vitest'
import { ENEMIES } from '@/entities/enemy/@x/battle'
import type { LevelConfig, LevelData } from '@/entities/level/@x/battle'
import { getLevel } from '@/entities/level'
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
  buildable: [{ x: 1, y: 1 }],
  spawn: { x: 0, y: 0.5 },
  hq: { x: 20, y: 0.5 },
}

const config: LevelConfig = {
  ...getLevel('desert-base'),
  startMoney: 123,
  hqHp: 7,
  hpScale: 2,
  allowedTowers: ['machineGun'],
  waves: [{ groups: [{ enemy: 'grunt', count: 1, interval: 1, delay: 0 }] }],
}

describe('LevelConfig в симуляции', () => {
  it('применяет деньги, HP штаба и число волн', () => {
    const { state } = createBattle({ seed: 1, level, config })
    expect(state).toMatchObject({ money: 123, hqHp: 7 })
    expect(state.wave.total).toBe(1)
  })

  it('startMoney опций перекрывает config', () => {
    expect(createBattle({ seed: 1, level, config, startMoney: 50 }).state.money).toBe(50)
  })

  it('hpScale умножает HP врагов волны уровня', () => {
    const battle = createBattle({ seed: 1, level, config })
    battle.dispatch({ type: 'startWave' })
    battle.step()
    expect(battle.state.enemies[0]).toMatchObject({
      type: 'grunt',
      hp: 2 * ENEMIES.grunt.hp,
      maxHp: 2 * ENEMIES.grunt.hp,
    })
  })

  it('запрещённая башня отклоняется towerNotAllowed, разрешённая строится', () => {
    const battle = createBattle({ seed: 1, level, config })
    const rejected: BattleEvent[] = []
    battle.on('commandRejected', (e) => rejected.push(e))
    battle.dispatch({ type: 'placeTower', towerType: 'rocket', cell: { x: 1, y: 1 } })
    battle.step()
    expect(rejected).toMatchObject([{ reason: 'towerNotAllowed' }])
    expect(battle.state.towers).toHaveLength(0)
    battle.dispatch({ type: 'placeTower', towerType: 'machineGun', cell: { x: 1, y: 1 } })
    battle.step()
    expect(battle.state.towers).toHaveLength(1)
  })
})
