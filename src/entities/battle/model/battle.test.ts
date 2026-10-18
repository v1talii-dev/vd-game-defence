import { describe, expect, it } from 'vitest'
import { ENEMIES } from '@/entities/enemy/@x/battle'
import type { LevelData } from '@/entities/level/@x/battle'
import { TOWERS, type TowerType } from '@/entities/tower/@x/battle'
import { waveSchedule } from '@/entities/wave/@x/battle'
import { TICK_RATE } from '@/shared/config'
import { DAMAGE_MATRIX, HQ_HP, PREP_SECONDS, START_MONEY } from '../config/battle'
import { createBattle, damageMultiplier, starsForHp } from './battle'
import type { BattleEvent, BattleOptions, Command } from './types'

// прямой путь длиной 20 клеток по y = 0.5, строить можно в ряду y = 1 и в (5, 5)
const level: LevelData = {
  id: 'test',
  width: 20,
  height: 6,
  path: [
    { x: 0, y: 0.5 },
    { x: 20, y: 0.5 },
  ],
  buildable: [...Array.from({ length: 20 }, (_, x) => ({ x, y: 1 })), { x: 5, y: 5 }],
  spawn: { x: 0, y: 0.5 },
  hq: { x: 20, y: 0.5 },
}

const PREP_TICKS = PREP_SECONDS * TICK_RATE

function setup(opts: Partial<BattleOptions> = {}) {
  const battle = createBattle({ seed: 7, level, ...opts })
  const events: BattleEvent[] = []
  const types = [
    'commandRejected',
    'moneyChanged',
    'hqHpChanged',
    'waveStarted',
    'waveCleared',
    'towerPlaced',
    'towerUpgraded',
    'towerSold',
    'towerRankUp',
    'targetPriorityChanged',
    'enemySpawned',
    'enemyKilled',
    'enemyLeaked',
    'projectileFired',
    'victory',
    'defeat',
  ] as const
  for (const t of types) battle.on(t, (e) => events.push(e))
  const run = (...cmds: Command[]) => {
    cmds.forEach((c) => battle.dispatch(c))
    battle.step()
  }
  const of = <T extends BattleEvent['type']>(type: T) =>
    events.filter((e): e is Extract<BattleEvent, { type: T }> => e.type === type)
  return { battle, state: battle.state, events, run, of }
}

const place = (x: number, y: number, towerType: TowerType = 'machineGun'): Command => ({
  type: 'placeTower',
  towerType,
  cell: { x, y },
})

describe('матрица урона и брони', () => {
  it('совпадает с SPEC §4.2', () => {
    expect(DAMAGE_MATRIX).toEqual({
      bullet: { infantry: 1, light: 0.6, tank: 0.25, air: 0.75 },
      rocket: { infantry: 0.4, light: 1, tank: 1.25, air: 1 },
      explosive: { infantry: 1.25, light: 0.8, tank: 0.6, air: 0 },
      antiAir: { infantry: 0, light: 0, tank: 0, air: 1.5 },
    })
    expect(damageMultiplier('rocket', 'tank')).toBe(1.25)
  })
})

describe('старт боя', () => {
  it('600 кредитов, HP штаба 20, пауза подготовки', () => {
    const { state } = setup()
    expect(state).toMatchObject({ tick: 0, money: START_MONEY, hqHp: HQ_HP, outcome: null })
    expect(state.wave).toMatchObject({
      number: 0,
      total: 12,
      phase: 'prep',
      prepTicksLeft: PREP_TICKS,
    })
  })

  it('первая волна начинается сама после паузы', () => {
    const { battle, of } = setup()
    battle.step(PREP_TICKS - 1)
    expect(of('waveStarted')).toHaveLength(0)
    battle.step()
    expect(of('waveStarted')).toEqual([
      { type: 'waveStarted', wave: 1, total: 12, early: false, bonus: 0 },
    ])
    expect(of('enemySpawned')[0]).toMatchObject({ enemyType: 'grunt' })
  })

  it('startWave задаёт номер следующей волны', () => {
    const { state, run } = setup({ startWave: 8 })
    expect(state.wave.number).toBe(7)
    run({ type: 'startWave' })
    expect(state.wave).toMatchObject({ number: 8, phase: 'active' })
  })
})

describe('команды', () => {
  it('применяются в начале следующего тика', () => {
    const { battle, state, of } = setup()
    battle.dispatch(place(3, 1))
    expect(state.towers).toHaveLength(0)
    battle.step()
    expect(state.towers).toHaveLength(1)
    expect(state.towers[0]).toMatchObject({ cell: { x: 3, y: 1 }, x: 3.5, y: 1.5, level: 1 })
    expect(state.money).toBe(START_MONEY - TOWERS.machineGun.levels[0].cost)
    expect(of('towerPlaced')[0]).toMatchObject({ towerType: 'machineGun', cell: { x: 3, y: 1 } })
    expect(of('moneyChanged')[0]).toMatchObject({ money: state.money, delta: -100 })
  })

  it('отклоняет невалидные команды с причиной', () => {
    const { state, run, of } = setup({ startMoney: 150 })
    run(place(3, 1))
    const towerId = state.towers[0]!.id
    run(
      place(3, 0),
      place(3, 1),
      place(4, 1),
      place(4.5, 1),
      { type: 'placeTower', towerType: 'laser' as never, cell: { x: 6, y: 1 } },
      { type: 'upgradeTower', towerId: 999 },
      { type: 'sellTower', towerId: 999 },
      { type: 'setTargetPriority', towerId, priority: 'weakest' as never },
      { type: 'grantMoney', amount: -5 },
      { type: 'grantMoney', amount: 1.5 },
      { type: 'nonsense' } as never,
    )
    expect(of('commandRejected').map((e) => e.reason)).toEqual([
      'notBuildable',
      'cellOccupied',
      'notEnoughMoney',
      'notBuildable',
      'unknownTowerType',
      'towerNotFound',
      'towerNotFound',
      'invalidPriority',
      'invalidAmount',
      'invalidAmount',
      'unknownCommand',
    ])
    // деньги никогда не уходят в минус
    expect(state.money).toBe(50)
    expect(state.towers).toHaveLength(1)
  })

  it('апгрейд до максимума, затем maxLevel', () => {
    const { state, run, of } = setup({ startMoney: 10_000 })
    run(place(3, 1, 'rocket'))
    const id = state.towers[0]!.id
    run({ type: 'upgradeTower', towerId: id })
    run({ type: 'upgradeTower', towerId: id })
    run({ type: 'upgradeTower', towerId: id })
    expect(state.towers[0]).toMatchObject({ level: 3 })
    expect(of('towerUpgraded').map((e) => e.level)).toEqual([2, 3])
    expect(of('commandRejected').map((e) => e.reason)).toEqual(['maxLevel'])
    const invested = TOWERS.rocket.levels.reduce((s, l) => s + l.cost, 0)
    expect(state.towers[0]!.invested).toBe(invested)
    expect(state.money).toBe(10_000 - invested)
  })

  it('апгрейд без денег отклоняется', () => {
    const { state, run, of } = setup({ startMoney: 100 })
    run(place(3, 1))
    run({ type: 'upgradeTower', towerId: state.towers[0]!.id })
    expect(of('commandRejected').map((e) => e.reason)).toEqual(['notEnoughMoney'])
    expect(state.money).toBe(0)
  })

  it('продажа возвращает 70% всех вложенных денег', () => {
    const { state, run, of } = setup()
    run(place(3, 1, 'rocket'))
    const id = state.towers[0]!.id
    run({ type: 'upgradeTower', towerId: id })
    const invested = TOWERS.rocket.levels[0].cost + TOWERS.rocket.levels[1].cost
    run({ type: 'sellTower', towerId: id })
    expect(state.towers).toHaveLength(0)
    expect(of('towerSold')).toEqual([
      { type: 'towerSold', towerId: id, refund: Math.floor(invested * 0.7) },
    ])
    expect(state.money).toBe(START_MONEY - invested + Math.floor(invested * 0.7))
  })

  it('приоритет цели меняется командой', () => {
    const { state, run, of } = setup()
    run(place(3, 1))
    const id = state.towers[0]!.id
    expect(state.towers[0]!.priority).toBe('first')
    run({ type: 'setTargetPriority', towerId: id, priority: 'strongest' })
    expect(state.towers[0]!.priority).toBe('strongest')
    expect(of('targetPriorityChanged')).toHaveLength(1)
  })

  it('grantMoney добавляет деньги', () => {
    const { state, run } = setup()
    run({ type: 'grantMoney', amount: 1000 })
    expect(state.money).toBe(START_MONEY + 1000)
  })
})

describe('досрочная волна', () => {
  it('бонус = оставшиеся секунды паузы (вниз) × номер волны', () => {
    const { battle, state, run, of } = setup()
    battle.step(5 * TICK_RATE + 10)
    run({ type: 'startWave' })
    // осталось 450 − 160 = 290 тиков = 9.67 с → 9 × волна 1
    expect(of('waveStarted')[0]).toMatchObject({ wave: 1, early: true, bonus: 9 })
    expect(state.money).toBe(START_MONEY + 9)

    run({ type: 'startWave' })
    expect(of('commandRejected').map((e) => e.reason)).toEqual(['waveInProgress'])

    // ждём конца волны 1 (без башен враги утекут), затем вызываем волну 2 сразу
    while (state.wave.phase === 'active') battle.step()
    run({ type: 'startWave' })
    expect(of('waveStarted')[1]).toMatchObject({ wave: 2, early: true, bonus: PREP_SECONDS * 2 })
  })

  it('после последней волны вызвать нечего', () => {
    const { state, run, of } = setup({ startWave: 12 })
    run({ type: 'startWave' })
    state.wave.phase = 'prep'
    run({ type: 'startWave' })
    expect(of('commandRejected').map((e) => e.reason)).toEqual(['noMoreWaves'])
  })
})

describe('утечка и поражение', () => {
  it('враг дошёл до штаба — штаб теряет leak', () => {
    const { battle, state, of } = setup()
    battle.step(PREP_TICKS)
    // 20 клеток при 1.6 клетки/с
    battle.step(Math.ceil((20 / ENEMIES.grunt.speed) * TICK_RATE))
    expect(of('enemyLeaked')[0]).toMatchObject({ enemyType: 'grunt', damage: ENEMIES.grunt.leak })
    expect(of('hqHpChanged')[0]).toEqual({ type: 'hqHpChanged', hp: HQ_HP - 1, delta: -1 })
    expect(state.hqHp).toBe(HQ_HP - 1)
  })

  it('HP 0 — поражение, дальше бой не идёт', () => {
    const { battle, state, of } = setup()
    while (!state.outcome) battle.step()
    expect(state.outcome).toEqual({ result: 'defeat' })
    expect(state.hqHp).toBe(0)
    expect(of('defeat')).toHaveLength(1)
    const tick = state.tick
    battle.dispatch({ type: 'grantMoney', amount: 1 })
    battle.step(10)
    expect(state.tick).toBe(tick)
  })
})

describe('бой', () => {
  it('убийство даёт награду и опыт башне, ранг растёт и не сбрасывается апгрейдом', () => {
    const { battle, state, run, of } = setup()
    run(place(2, 1))
    const tower = state.towers[0]!
    tower.xp = 145
    run({ type: 'startWave' })
    while (of('enemyKilled').length === 0) battle.step()
    const kill = of('enemyKilled')[0]!
    expect(kill).toMatchObject({
      towerId: tower.id,
      enemyType: 'grunt',
      reward: ENEMIES.grunt.reward,
    })
    expect(of('projectileFired')[0]).toMatchObject({ towerId: tower.id })
    expect(tower.xp).toBe(145 + ENEMIES.grunt.reward)
    expect(tower.rank).toBe(1)
    expect(of('towerRankUp')).toEqual([{ type: 'towerRankUp', towerId: tower.id, rank: 1 }])
    expect(of('moneyChanged').at(-1)).toMatchObject({ delta: ENEMIES.grunt.reward })

    run({ type: 'upgradeTower', towerId: tower.id })
    expect(state.towers[0]).toMatchObject({ level: 2, rank: 1 })
  })

  it('ПВО не стреляет по наземным целям', () => {
    const { battle, run, of } = setup()
    run(place(2, 1, 'antiAir'), { type: 'startWave' })
    battle.step(3 * TICK_RATE)
    expect(of('enemySpawned').length).toBeGreaterThan(0)
    expect(of('projectileFired')).toHaveLength(0)
  })

  it('миномёт бьёт сплэшем по земле', () => {
    const { battle, state, run, of } = setup({ startMoney: 1000 })
    run(place(5, 5, 'mortar'), { type: 'startWave' })
    while (of('projectileFired').length === 0) battle.step()
    while (state.projectiles.length > 0) battle.step()
    const damaged = state.enemies.filter((e) => e.hp < e.maxHp).length + of('enemyKilled').length
    expect(damaged).toBeGreaterThan(0)
  })

  it('босс ниже 50% HP один раз выпускает 4 боевиков', () => {
    const { battle, state, run, of } = setup({ startWave: 12, startMoney: 10_000 })
    run({ type: 'startWave' })
    const boss = state.enemies.find((e) => e.type === 'boss')!
    boss.hp = boss.maxHp / 2 + 1
    run(place(1, 1, 'rocket'))
    while (!boss.spawnedMinions) battle.step()
    const grunts = of('enemySpawned').filter((e) => e.enemyType === 'grunt')
    // первые боевики по расписанию волны 12 выходят только через 2 с
    expect(state.wave.elapsedTicks).toBeLessThan(waveSchedule(12)[1]!.tick)
    expect(grunts).toHaveLength(4)
    battle.step(5)
    expect(of('enemySpawned').filter((e) => e.enemyType === 'grunt')).toHaveLength(4)
  })

  it('волна зачищена — пауза; после 12-й — победа со звёздами', () => {
    const { battle, state, run, of } = setup({ startWave: 12 })
    run({ type: 'startWave' })
    // имитируем полностью отбитую волну
    state.wave.spawnIndex = waveSchedule(12).length
    state.enemies.length = 0
    state.hqHp = 15
    battle.step()
    expect(of('waveCleared')).toEqual([{ type: 'waveCleared', wave: 12 }])
    expect(state.outcome).toEqual({ result: 'victory', stars: 2 })
    expect(of('victory')).toEqual([{ type: 'victory', stars: 2, hqHp: 15 }])
  })

  it('после зачистки обычной волны начинается пауза 15 с', () => {
    const { battle, state, run, of } = setup()
    run({ type: 'startWave' })
    state.wave.spawnIndex = waveSchedule(1).length
    state.enemies.length = 0
    battle.step()
    expect(of('waveCleared')).toEqual([{ type: 'waveCleared', wave: 1 }])
    expect(state.wave).toMatchObject({ phase: 'prep', prepTicksLeft: PREP_TICKS })
  })
})

describe('звёзды', () => {
  it('3 при HP ≥ 18, 2 при HP ≥ 10, иначе 1', () => {
    expect([20, 18, 17, 10, 9, 1].map(starsForHp)).toEqual([3, 3, 2, 2, 1, 1])
  })
})
