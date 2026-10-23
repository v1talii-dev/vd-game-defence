import { describe, expect, it } from 'vitest'
import type { EnemyType } from '@/entities/enemy/@x/battle'
import type { LevelData } from '@/entities/level/@x/battle'
import {
  RANKS,
  TOWERS,
  buildTicks,
  regenPerTick,
  towerMaxHp,
  upgradeTicks,
  type TowerType,
} from '@/entities/tower/@x/battle'
import { hashState } from '@/shared/lib/sim'
import { createBattle } from './battle'
import type { BattleEvent, BattleEventOf } from './types'

// путь по y = 2.5, площадки симметрично сверху (y = 1) и снизу (y = 3)
const level: LevelData = {
  id: 'test',
  width: 24,
  height: 6,
  path: [
    { x: 0, y: 2.5 },
    { x: 24, y: 2.5 },
  ],
  buildable: Array.from({ length: 24 }, (_, x) => [
    { x, y: 1 },
    { x, y: 3 },
  ]).flat(),
  spawn: { x: 0, y: 2.5 },
  hq: { x: 24, y: 2.5 },
}

function setup(towers: readonly [TowerType, number, number][]) {
  const battle = createBattle({ seed: 7, level, startMoney: 9999 })
  const events: BattleEvent[] = []
  for (const type of ['enemyFired', 'towerDamaged', 'towerDestroyed'] as const)
    battle.on(type, (e) => events.push(e))
  for (const [type, x, y] of towers)
    battle.dispatch({ type: 'placeTower', towerType: type, cell: { x, y } })
  battle.step(buildTicks('rocket') + 2)
  // идёт волна: вне волны башни бесплатно лечатся (авторемонт)
  battle.dispatch({ type: 'startWave' })
  battle.step()
  const of = <T extends BattleEvent['type']>(t: T) =>
    events.filter((e): e is BattleEventOf<T> => e.type === t)
  // враг не умирает от башен: нужен только обстрел
  const spawn = (type: EnemyType, count = 1, spacing = 0) => {
    battle.dispatch({ type: 'spawnEnemies', enemyType: type, count, spacing })
    battle.step()
    for (const e of battle.state.enemies) e.hp = e.maxHp = 1e9
  }
  return { battle, events, of, spawn }
}

describe('HP башен', () => {
  it('максимум HP: уровень × множитель ранга', () => {
    expect(towerMaxHp('machineGun', 1, 0)).toBe(140)
    expect(towerMaxHp('machineGun', 3, 0)).toBe(230)
    expect(towerMaxHp('rocket', 1, 0)).toBe(180)
    expect(towerMaxHp('rocket', 3, 3)).toBe(Math.round(300 * RANKS[3].hpMul))
    const t = setup([['machineGun', 3, 1]]).battle.state.towers[0]!
    expect(t).toMatchObject({ hp: 140, maxHp: 140 })
  })
})

describe('атака врагов по башням', () => {
  it.each(['grenadier', 'tank', 'boss'] as const)('%s бьёт башню', (type) => {
    const s = setup([['machineGun', 3, 1]])
    s.spawn(type)
    s.battle.step(120)
    expect(s.of('enemyFired').length).toBeGreaterThan(0)
    const hit = s.of('towerDamaged')[0]!
    expect(hit.amount).toBe(type === 'grenadier' ? 12 : type === 'tank' ? 30 : 60)
    expect(s.battle.state.towers[0]!.hp).toBeLessThan(140)
  })

  it.each(['grunt', 'technical', 'drone'] as const)('%s башню не бьёт', (type) => {
    const s = setup([['machineGun', 3, 1]])
    s.spawn(type, 3, 1)
    s.battle.step(300)
    expect(s.of('enemyFired')).toEqual([])
    expect(s.battle.state.towers[0]!.hp).toBe(140)
  })

  it('урон наносится в момент прилёта, а не выстрела', () => {
    const s = setup([['machineGun', 3, 1]])
    s.spawn('grenadier')
    let firedAt = -1
    let hitAt = -1
    for (let i = 0; i < 120 && hitAt < 0; i++) {
      s.battle.step()
      if (firedAt < 0 && s.of('enemyFired').length) {
        firedAt = s.battle.state.tick
        expect(s.battle.state.towers[0]!.hp).toBe(140)
        expect(s.battle.state.projectiles.some((p) => p.hostile && p.kind === 'shell')).toBe(true)
      }
      if (s.of('towerDamaged').length) hitAt = s.battle.state.tick
    }
    expect(firedAt).toBeGreaterThan(0)
    expect(hitAt).toBeGreaterThan(firedAt)
  })

  it('ближайшая башня; при равенстве — меньший id', () => {
    // обе башни на одинаковом расстоянии от пути (сверху и снизу)
    const s = setup([
      ['machineGun', 3, 3],
      ['machineGun', 3, 1],
    ])
    const [a, b] = s.battle.state.towers
    expect(a!.id).toBeLessThan(b!.id)
    s.spawn('grenadier')
    s.battle.step(200)
    expect(s.of('enemyFired')[0]!.towerId).toBe(a!.id)

    // ближняя бьётся раньше дальней, даже если у неё больший id
    const c = setup([
      ['machineGun', 4, 1],
      ['machineGun', 2, 3],
    ])
    c.spawn('grenadier')
    c.battle.step(200)
    expect(c.of('enemyFired')[0]!.towerId).toBe(c.battle.state.towers[1]!.id)
  })

  it('цель закрепляется, пока жива и в радиусе', () => {
    const s = setup([
      ['machineGun', 8, 1],
      ['machineGun', 10, 3],
    ])
    const [a] = s.battle.state.towers
    s.spawn('grenadier')
    s.battle.step(330)
    // третий выстрел (x ≈ 10.6) — когда вторая башня уже ближе, но цель прежняя
    const fired = s.of('enemyFired')
    expect(fired.length).toBeGreaterThanOrEqual(3)
    expect(fired.slice(0, 3).map((e) => e.towerId)).toEqual([a!.id, a!.id, a!.id])
  })

  it('строящаяся неуязвима, улучшающаяся уязвима', () => {
    const battle = createBattle({ seed: 7, level, startMoney: 9999 })
    const fired: number[] = []
    battle.on('enemyFired', (e) => fired.push(e.towerId))
    battle.dispatch({ type: 'placeTower', towerType: 'machineGun', cell: { x: 2, y: 1 } })
    battle.dispatch({ type: 'spawnEnemies', enemyType: 'grenadier', count: 1, spacing: 0 })
    battle.step(buildTicks('machineGun') - 3)
    for (const e of battle.state.enemies) e.hp = e.maxHp = 1e9
    expect(battle.state.towers[0]!.phase).toBe('building')
    expect(fired).toEqual([])
    battle.step(10)
    expect(battle.state.towers[0]!.phase).toBe('active')
    battle.dispatch({ type: 'upgradeTower', towerId: battle.state.towers[0]!.id })
    battle.step(60)
    expect(battle.state.towers[0]!.phase).toBe('upgrading')
    expect(fired.length).toBeGreaterThan(0)
    expect(battle.state.towers[0]!.hp).toBeLessThan(140)
  })
})

describe('разрушение', () => {
  it('HP = 0 даёт руины с сохранённым рангом; снаряд пропадает без второго урона', () => {
    const s = setup([['machineGun', 3, 1]])
    const t = s.battle.state.towers[0]!
    t.xp = 400
    t.rank = 2
    t.maxHp = towerMaxHp('machineGun', 1, 2)
    t.hp = 5 // регенерация элиты чуть добавит до выстрела
    // два залпа в один тик: второй снаряд летит в уже разрушенную башню
    s.spawn('grenadier', 2, 0)
    s.battle.step(60)
    expect(t).toMatchObject({ phase: 'ruins', rank: 2, xp: 400, hp: 0 })
    expect(s.of('towerDestroyed')).toEqual([
      { type: 'towerDestroyed', towerId: t.id, x: 3.5, y: 1.5 },
    ])
    expect(s.of('towerDamaged')).toHaveLength(1)
    expect(s.of('towerDamaged')[0]!.amount).toBeLessThan(12)
    expect(s.battle.state.projectiles.filter((p) => p.hostile)).toEqual([])
    // руины не цель и не стреляют; клетка занята, продать нельзя
    const firedBefore = s.of('enemyFired').length
    s.battle.step(200)
    expect(s.of('enemyFired')).toHaveLength(firedBefore)
    expect(t.cooldown).toBe(0)
    const rejected: string[] = []
    s.battle.on('commandRejected', (e) => rejected.push(e.reason))
    s.battle.dispatch({ type: 'placeTower', towerType: 'rocket', cell: { x: 3, y: 1 } })
    s.battle.dispatch({ type: 'sellTower', towerId: t.id })
    s.battle.step()
    expect(rejected).toEqual(['cellOccupied', 'notBuilding'])
  })
})

describe('HP: ранг, улучшение, самолечение, продажа', () => {
  it('самолечение по рангам: рядовой не лечится, герой лечится', () => {
    const s = setup([
      ['machineGun', 2, 1],
      ['machineGun', 5, 1],
    ])
    const [a, b] = s.battle.state.towers
    b!.rank = 3
    b!.maxHp = towerMaxHp('machineGun', 1, 3)
    a!.hp = 50
    b!.hp = 50
    s.battle.step(30)
    expect(a!.hp).toBe(50)
    expect(b!.hp).toBeCloseTo(50 + 30 * regenPerTick(3, b!.maxHp), 6)
    expect(b!.hp).toBeCloseTo(50 + b!.maxHp * RANKS[3].regenPerSec, 6)
  })

  it('рост ранга поднимает максимум, текущее HP растёт на разницу', () => {
    const s = setup([['machineGun', 3, 1]])
    const t = s.battle.state.towers[0]!
    t.hp = 100
    t.xp = 145
    s.battle.dispatch({ type: 'spawnEnemies', enemyType: 'grunt', count: 1, spacing: 0 })
    s.battle.step(300)
    expect(t.rank).toBeGreaterThanOrEqual(1)
    expect(t.maxHp).toBe(towerMaxHp('machineGun', 1, t.rank))
    // +разница максимумов и немного самолечения нового ранга
    expect(t.hp).toBeGreaterThanOrEqual(100 + (t.maxHp - 140))
    expect(t.hp).toBeLessThan(100 + (t.maxHp - 140) + 10)
  })

  it('завершение улучшения полностью лечит', () => {
    const s = setup([['machineGun', 3, 1]])
    const t = s.battle.state.towers[0]!
    t.hp = 30
    s.battle.dispatch({ type: 'upgradeTower', towerId: t.id })
    s.battle.step(upgradeTicks('machineGun', 1) + 2)
    expect(t.level).toBe(2)
    expect(t).toMatchObject({ hp: 180, maxHp: 180 })
  })

  it('продажа повреждённой башни возвращает то же, что целой', () => {
    const s = setup([
      ['machineGun', 2, 1],
      ['machineGun', 5, 1],
    ])
    const [a, b] = s.battle.state.towers
    b!.hp = 1
    s.battle.step()
    expect(b!.sellRefund).toBe(a!.sellRefund)
    expect(b!.sellRefund).toBe(TOWERS.machineGun.levels[0].cost)
  })
})

describe('детерминизм', () => {
  it('два прогона с обстрелом башен дают один хэш', () => {
    const run = () => {
      const s = setup([
        ['machineGun', 3, 1],
        ['rocket', 6, 3],
      ])
      s.battle.dispatch({ type: 'spawnEnemies', enemyType: 'tank', count: 3, spacing: 1 })
      s.battle.step(600)
      return hashState(s.battle.state)
    }
    expect(run()).toBe(run())
  })
})
