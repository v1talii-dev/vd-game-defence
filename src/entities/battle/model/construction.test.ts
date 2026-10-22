import { describe, expect, it } from 'vitest'
import type { LevelData } from '@/entities/level/@x/battle'
import { TOWERS, buildTicks, upgradeTicks, type TowerType } from '@/entities/tower/@x/battle'
import { hashState } from '@/shared/lib/sim'
import { createBattle } from './battle'
import type { BattleEvent, Command } from './types'

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
const RK = TOWERS.rocket.levels[0].cost

function setup(startMoney: number) {
  const battle = createBattle({ seed: 3, level, startMoney })
  const events: BattleEvent[] = []
  const types = [
    'commandRejected',
    'towerOrdered',
    'towerBuildStarted',
    'towerBuilt',
    'towerBuildCancelled',
    'towerUpgradeStarted',
    'towerUpgradeCancelled',
    'towerUpgraded',
    'towerSold',
    'projectileFired',
  ] as const
  for (const t of types) battle.on(t, (e) => events.push(e))
  const run = (...cmds: Command[]) => {
    cmds.forEach((c) => battle.dispatch(c))
    battle.step()
  }
  const of = <T extends BattleEvent['type']>(type: T) =>
    events.filter((e): e is Extract<BattleEvent, { type: T }> => e.type === type)
  const place = (x: number, towerType: TowerType = 'machineGun'): Command => ({
    type: 'placeTower',
    towerType,
    cell: { x, y: 1 },
  })
  return { battle, state: battle.state, run, of, place }
}

describe('очередь постройки', () => {
  it('хватает денег — сразу оплата и стройка; завершение ровно через buildTicks', () => {
    const { battle, state, run, of, place } = setup(MG)
    run(place(3))
    const t = state.towers[0]!
    expect(t).toMatchObject({ phase: 'building', invested: MG, progress: 0 })
    expect(state.money).toBe(0)
    expect(of('towerOrdered')[0]).toMatchObject({ waiting: false })
    expect(of('towerBuildStarted')[0]).toMatchObject({ cost: MG, ticks: buildTicks('machineGun') })
    battle.step(buildTicks('machineGun') - 1)
    expect(t.phase).toBe('building')
    expect(t.progress).toBeCloseTo(1 - 1 / buildTicks('machineGun'))
    battle.step()
    expect(t).toMatchObject({ phase: 'active', progress: 1, phaseTicksLeft: 0 })
    expect(of('towerBuilt')).toHaveLength(1)
  })

  it('нехватка денег: заказ ждёт, клетка занята, оплата при появлении денег', () => {
    const { state, run, of, place } = setup(50)
    run(place(3))
    expect(state.towers[0]).toMatchObject({ phase: 'queued', invested: 0, progress: 0 })
    expect(of('towerOrdered')[0]).toMatchObject({ waiting: true })
    run(place(3))
    expect(of('commandRejected').map((e) => e.reason)).toEqual(['cellOccupied'])
    run({ type: 'grantMoney', amount: 50 })
    expect(state.towers[0]!.phase).toBe('building')
    expect(state.money).toBe(0)
  })

  it('FIFO: пока первый заказ не оплачен, следующий (дешевле) ждёт', () => {
    const { state, run, place } = setup(MG)
    run(place(1, 'rocket'), place(2))
    expect(state.towers.map((t) => t.phase)).toEqual(['queued', 'queued'])
    run({ type: 'grantMoney', amount: RK - MG })
    expect(state.towers.map((t) => t.phase)).toEqual(['building', 'queued'])
    run({ type: 'grantMoney', amount: MG })
    expect(state.towers.map((t) => t.phase)).toEqual(['building', 'building'])
    expect(state.money).toBe(0)
  })

  it('строящаяся и ждущая башни не стреляют и не получают XP', () => {
    const { battle, state, run, of, place } = setup(MG)
    run(place(3), { type: 'spawnEnemies', enemyType: 'grunt', count: 1 })
    state.enemies[0]!.distance = 2
    battle.step(buildTicks('machineGun') - 2)
    expect(of('projectileFired')).toHaveLength(0)
    expect(state.towers[0]!.targetId).toBeNull()
    battle.step(3)
    expect(of('projectileFired').length).toBeGreaterThan(0)
  })

  it('cancelBuild: неоплаченный — без потерь, строящийся — возврат 100%', () => {
    const { state, run, of, place } = setup(MG)
    run(place(1), place(2))
    const [a, b] = state.towers
    run({ type: 'cancelBuild', towerId: b!.id })
    expect(of('towerBuildCancelled')[0]).toEqual({
      type: 'towerBuildCancelled',
      towerId: b!.id,
      refund: 0,
    })
    expect(state.money).toBe(0)
    run({ type: 'cancelBuild', towerId: a!.id })
    expect(state.money).toBe(MG)
    expect(state.towers).toHaveLength(0)
    run({ type: 'cancelBuild', towerId: a!.id })
    expect(of('commandRejected').at(-1)?.reason).toBe('towerNotFound')
  })

  it('отмена оплаченного заказа освобождает деньги следующему в очереди', () => {
    const { state, run, place } = setup(MG)
    run(place(1), place(2))
    run({ type: 'cancelBuild', towerId: state.towers[0]!.id })
    expect(state.towers.map((t) => t.phase)).toEqual(['building'])
  })

  it('продажа строящейся = отмена с возвратом 100%', () => {
    const { state, run, of, place } = setup(MG)
    run(place(1))
    run({ type: 'sellTower', towerId: state.towers[0]!.id })
    expect(state.money).toBe(MG)
    expect(of('towerSold')).toHaveLength(0)
    expect(of('towerBuildCancelled')).toHaveLength(1)
  })
})

describe('время улучшения', () => {
  function built() {
    const ctx = setup(10_000)
    ctx.run(ctx.place(3, 'rocket'))
    ctx.battle.step(buildTicks('rocket'))
    return { ...ctx, tower: ctx.state.towers[0]! }
  }

  it('деньги списываются сразу, башня не стреляет, уровень применяется ровно в тик завершения', () => {
    const { battle, state, run, of, tower } = built()
    const money = state.money
    const n = upgradeTicks('rocket', 1)
    tower.xp = 100
    run({ type: 'upgradeTower', towerId: tower.id }, { type: 'spawnEnemies', enemyType: 'grunt', count: 1 })
    state.enemies[0]!.distance = 2
    const cost = TOWERS.rocket.levels[1].cost
    expect(state.money).toBe(money - cost)
    expect(tower).toMatchObject({ phase: 'upgrading', level: 1, phaseTicksTotal: n, phasePaid: cost })
    expect(of('towerUpgradeStarted')[0]).toMatchObject({ toLevel: 2, cost, ticks: n })
    battle.step(n - 1)
    expect(tower).toMatchObject({ phase: 'upgrading', level: 1 })
    expect(of('projectileFired')).toHaveLength(0)
    expect(tower.xp).toBe(100)
    battle.step()
    expect(tower).toMatchObject({ phase: 'active', level: 2, xp: 100, rank: 0, progress: 1 })
    expect(of('towerUpgraded')).toEqual([{ type: 'towerUpgraded', towerId: tower.id, level: 2, cost }])
  })

  it('cancelUpgrade возвращает 100% и оставляет уровень; повторные команды отклоняются', () => {
    const { battle, state, run, of, tower } = built()
    const money = state.money
    run({ type: 'upgradeTower', towerId: tower.id })
    run({ type: 'upgradeTower', towerId: tower.id })
    run({ type: 'cancelBuild', towerId: tower.id })
    run({ type: 'cancelUpgrade', towerId: tower.id })
    expect(state.money).toBe(money)
    expect(tower).toMatchObject({ phase: 'active', level: 1, invested: RK })
    run({ type: 'cancelUpgrade', towerId: tower.id })
    expect(of('commandRejected').map((e) => e.reason)).toEqual([
      'alreadyUpgrading',
      'notBuilding',
      'notUpgrading',
    ])
    expect(of('towerUpgradeCancelled')).toHaveLength(1)
    battle.step(300)
    expect(tower.level).toBe(1)
  })

  it('продажа улучшаемой запрещена, строящейся нельзя улучшать', () => {
    const { state, run, of, place } = setup(10_000)
    run(place(1))
    run({ type: 'upgradeTower', towerId: state.towers[0]!.id })
    run({ type: 'cancelUpgrade', towerId: state.towers[0]!.id })
    expect(of('commandRejected').map((e) => e.reason)).toEqual(['stillBuilding', 'notUpgrading'])
    state.towers[0]!.phase = 'active'
    run({ type: 'upgradeTower', towerId: state.towers[0]!.id })
    run({ type: 'sellTower', towerId: state.towers[0]!.id })
    expect(of('commandRejected').at(-1)?.reason).toBe('upgradeInProgress')
    expect(state.towers).toHaveLength(1)
  })
})

describe('детерминизм построек', () => {
  it('одинаковые команды — одинаковое состояние', () => {
    const play = () => {
      const { battle, state, run, place } = setup(150)
      run(place(1), place(2, 'rocket'), place(3))
      battle.step(100)
      run({ type: 'grantMoney', amount: 400 })
      run({ type: 'upgradeTower', towerId: state.towers[0]!.id })
      battle.step(400)
      return hashState(state)
    }
    expect(play()).toBe(play())
  })
})
