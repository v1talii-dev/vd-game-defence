import { describe, expect, it } from 'vitest'
import type { LevelData } from '@/entities/level/@x/battle'
import {
  AUTO_REPAIR_PER_SEC,
  REPAIR_COST_RATIO,
  REPAIR_SECONDS,
  RESTORE_COST_RATIO,
  TOWERS,
  buildTicks,
  repairCost,
  towerMaxHp,
} from '@/entities/tower/@x/battle'
import { TICK_RATE } from '@/shared/config'
import { hashState } from '@/shared/lib/sim'
import { createBattle } from './battle'
import { recordCommands, runReplay } from './replay'
import type { BattleEvent, BattleEventOf, RejectReason } from './types'

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
const MG = 100
const MAX_HP = TOWERS.machineGun.levels[0].hp
const HALF = MAX_HP / 2
const RESTORE = Math.ceil(RESTORE_COST_RATIO * MG)
const REPAIR_HALF = repairCost(MG, HALF, MAX_HP)
const TYPES = [
  'towerRepairStarted',
  'towerRepaired',
  'towerRestoreOrdered',
  'towerRestoreCancelled',
  'towerRestored',
  'ruinsCleared',
  'towerBuildStarted',
  'commandRejected',
  'projectileFired',
  'towerDamaged',
] as const

function setup() {
  const battle = createBattle({ seed: 3, level, startMoney: 9999 })
  const events: BattleEvent[] = []
  for (const type of TYPES) battle.on(type, (e) => events.push(e))
  battle.dispatch({ type: 'placeTower', towerType: 'machineGun', cell: { x: 3, y: 1 } })
  battle.step(buildTicks('machineGun') + 2)
  const tower = battle.state.towers[0]!
  const of = <T extends BattleEvent['type']>(t: T) =>
    events.filter((e): e is BattleEventOf<T> => e.type === t)
  const reasons = () => of('commandRejected').map((e) => e.reason)
  const dispatch = (cmd: Parameters<typeof battle.dispatch>[0]) => {
    battle.dispatch(cmd)
    battle.step()
  }
  // идёт волна: живой медленный враг не даёт ей закончиться
  const startWave = () => {
    dispatch({ type: 'startWave' })
    dispatch({ type: 'spawnEnemies', enemyType: 'grunt', count: 1 })
    for (const e of battle.state.enemies) e.hp = e.maxHp = 1e9
  }
  // руины с сохранённым рангом
  const ruin = () => {
    tower.rank = 2
    tower.xp = 400
    tower.phase = 'ruins'
    tower.hp = 0
  }
  return { battle, tower, of, reasons, dispatch, startWave, ruin }
}

describe('ремонт: цена', () => {
  it('на границах: 1 HP, половина, почти полное', () => {
    expect(repairCost(MG, MAX_HP - 1, MAX_HP)).toBe(1)
    expect(repairCost(MG, HALF, MAX_HP)).toBe(Math.ceil(REPAIR_COST_RATIO * MG * 0.5))
    expect(repairCost(MG, 1, MAX_HP)).toBe(
      Math.ceil((REPAIR_COST_RATIO * MG * (MAX_HP - 1)) / MAX_HP),
    )
    expect(repairCost(MG, MAX_HP, MAX_HP)).toBe(0)
  })

  it('списывается сразу, снимок показывает цену', () => {
    const s = setup()
    s.tower.hp = HALF
    s.battle.step()
    expect(s.tower.repairCost).toBe(REPAIR_HALF)
    const money = s.battle.state.money
    s.dispatch({ type: 'repairTower', towerId: s.tower.id })
    expect(s.battle.state.money).toBe(money - REPAIR_HALF)
    expect(s.of('towerRepairStarted')[0]).toMatchObject({ cost: REPAIR_HALF })
    expect(s.tower.repairCost).toBe(0)
  })

  it('нет денег — отказ, в очередь не ставится', () => {
    const s = setup()
    s.tower.hp = HALF
    s.battle.state.money = 5
    s.dispatch({ type: 'repairTower', towerId: s.tower.id })
    expect(s.reasons()).toEqual(['notEnoughMoney'])
    expect(s.battle.state.money).toBe(5)
    expect(s.tower.repairTicksLeft).toBe(0)
    s.battle.state.money = 9999
    s.battle.step(5)
    expect(s.tower.repairTicksLeft).toBe(0)
  })
})

describe('ремонт: ход', () => {
  it('во время волны лечит за REPAIR_SECONDS, башня стреляет', () => {
    const s = setup()
    s.startWave()
    s.tower.hp = HALF
    const shots = s.of('projectileFired').length
    s.dispatch({ type: 'repairTower', towerId: s.tower.id })
    s.battle.step((REPAIR_SECONDS * TICK_RATE) / 2)
    expect(s.tower.repairProgress).toBeCloseTo(0.5, 1)
    expect(Math.abs(s.tower.hp - (HALF + MAX_HP) / 2)).toBeLessThan(1)
    s.battle.step(REPAIR_SECONDS * TICK_RATE)
    expect(s.tower.hp).toBeCloseTo(MAX_HP, 3)
    expect(s.tower.repairProgress).toBeNull()
    expect(s.of('towerRepaired')).toHaveLength(1)
    expect(s.of('projectileFired').length).toBeGreaterThan(shots)
    expect(s.tower.repairCost).toBe(0)
  })

  it('отказы: полное HP, повторный ремонт, строящаяся башня', () => {
    const s = setup()
    s.dispatch({ type: 'repairTower', towerId: s.tower.id })
    s.startWave()
    s.tower.hp = HALF
    s.dispatch({ type: 'repairTower', towerId: s.tower.id })
    s.dispatch({ type: 'repairTower', towerId: s.tower.id })
    s.dispatch({ type: 'placeTower', towerType: 'machineGun', cell: { x: 6, y: 1 } })
    s.dispatch({ type: 'repairTower', towerId: s.battle.state.towers[1]!.id })
    expect(s.reasons()).toEqual<RejectReason[]>(['fullHp', 'alreadyRepairing', 'notRepairable'])
  })

  it('добивание во время ремонта: остаток сгорает', () => {
    const s = setup()
    s.startWave()
    s.dispatch({ type: 'spawnEnemies', enemyType: 'tank', count: 1 })
    for (const e of s.battle.state.enemies) e.hp = e.maxHp = 1e9
    // танк уже бьёт: ставим HP ниже его выстрела и чиним, следующий снаряд добивает
    for (let i = 0; i < 600 && s.of('towerDamaged').length === 0; i++) s.battle.step()
    // ждём, пока танк почти перезарядится, чтобы ремонт не успел поднять HP выше его выстрела
    const tank = s.battle.state.enemies.find((e) => e.type === 'tank')!
    for (let i = 0; i < 100 && tank.towerCooldown > 2; i++) s.battle.step()
    s.tower.hp = 1
    s.dispatch({ type: 'repairTower', towerId: s.tower.id })
    // пока снаряд летит, держим HP ниже урона танка: ремонт не должен успеть его перебить
    for (let i = 0; i < 60; i++) {
      if (s.battle.state.projectiles.some((p) => p.hostile) && s.tower.phase === 'active')
        s.tower.hp = 1
      s.battle.step()
    }
    expect(s.tower.phase).toBe('ruins')
    expect(s.tower.repairTicksLeft).toBe(0)
    expect(s.tower.repairProgress).toBeNull()
    expect(s.of('towerRepaired')).toHaveLength(0)
    s.dispatch({ type: 'repairTower', towerId: s.tower.id })
    expect(s.reasons()).toEqual(['notRepairable'])
  })
})

describe('авторемонт и самолечение', () => {
  it('вне волны лечит AUTO_REPAIR_PER_SEC в секунду, во время волны нет', () => {
    const s = setup()
    s.tower.hp = HALF
    s.battle.step(TICK_RATE)
    expect(s.tower.hp).toBeCloseTo(HALF + MAX_HP * AUTO_REPAIR_PER_SEC, 3)
    s.startWave()
    const hp = s.tower.hp
    s.battle.step(TICK_RATE)
    expect(s.tower.hp).toBe(hp)
  })

  it('руины не лечатся ни авторемонтом, ни самолечением', () => {
    const s = setup()
    s.ruin()
    s.battle.step(TICK_RATE * 3)
    expect(s.tower.hp).toBe(0)
  })

  it('герой лечится по рангу и во время волны, рядовой нет', () => {
    const s = setup()
    s.startWave()
    s.tower.hp = HALF
    s.battle.step(TICK_RATE)
    expect(s.tower.hp).toBe(HALF)
    s.tower.rank = 3
    s.tower.maxHp = towerMaxHp('machineGun', 1, 3)
    s.battle.step(TICK_RATE)
    expect(s.tower.hp).toBeGreaterThan(HALF + 3)
  })
})

describe('восстановление руин', () => {
  it('платный заказ, строится buildSeconds, ранг сохраняется, HP полное', () => {
    const s = setup()
    s.ruin()
    const money = s.battle.state.money
    const cost = Math.ceil(RESTORE_COST_RATIO * MG)
    s.dispatch({ type: 'restoreTower', towerId: s.tower.id })
    expect(s.of('towerRestoreOrdered')[0]).toMatchObject({ cost, waiting: false })
    expect(s.battle.state.money).toBe(money - cost)
    expect(s.tower.phase).toBe('building')
    s.battle.step(buildTicks('machineGun') + 1)
    expect(s.tower).toMatchObject({ phase: 'active', rank: 2, xp: 400, restoring: false })
    expect(s.tower.hp).toBe(s.tower.maxHp)
    expect(s.of('towerRestored')).toHaveLength(1)
    expect(s.tower.invested).toBe(MG + cost)
  })

  it('общая FIFO: ждёт заказ, оформленный раньше, и не обгоняет', () => {
    const s = setup()
    s.ruin()
    s.battle.state.money = 0
    s.dispatch({ type: 'placeTower', towerType: 'machineGun', cell: { x: 6, y: 1 } })
    s.dispatch({ type: 'restoreTower', towerId: s.tower.id })
    expect(s.of('towerRestoreOrdered')[0]!.waiting).toBe(true)
    // денег хватает на восстановление (RESTORE), но не на постройку (100) — первой в очереди
    s.battle.state.money = RESTORE
    s.battle.step(3)
    expect(s.tower.phase).toBe('ruins')
    expect(s.tower.restoreOrder).not.toBeNull()
    s.battle.state.money = 100 + RESTORE
    s.battle.step(3)
    expect(s.battle.state.towers[1]!.phase).toBe('building')
    expect(s.tower.phase).toBe('building')
    expect(s.battle.state.money).toBe(0)
  })

  it('отмена: заказ без возврата, стройка с возвратом; башня остаётся руинами', () => {
    const s = setup()
    s.ruin()
    s.battle.state.money = 0
    s.dispatch({ type: 'restoreTower', towerId: s.tower.id })
    s.dispatch({ type: 'restoreTower', towerId: s.tower.id })
    s.dispatch({ type: 'cancelBuild', towerId: s.tower.id })
    expect(s.of('towerRestoreCancelled')[0]).toMatchObject({ refund: 0 })
    expect(s.tower).toMatchObject({ phase: 'ruins', restoreOrder: null, rank: 2 })
    s.battle.state.money = 500
    s.dispatch({ type: 'restoreTower', towerId: s.tower.id })
    expect(s.battle.state.money).toBe(500 - RESTORE)
    s.dispatch({ type: 'cancelBuild', towerId: s.tower.id })
    expect(s.of('towerRestoreCancelled')[1]).toMatchObject({ refund: RESTORE })
    expect(s.battle.state.money).toBe(500)
    expect(s.tower).toMatchObject({ phase: 'ruins', invested: MG, restoring: false })
    expect(s.reasons()).toEqual(['alreadyRestoring'])
  })

  it('restoreTower/clearRuins не для живой башни', () => {
    const s = setup()
    s.dispatch({ type: 'restoreTower', towerId: s.tower.id })
    s.dispatch({ type: 'clearRuins', towerId: s.tower.id })
    expect(s.reasons()).toEqual(['notRuins', 'notRuins'])
  })
})

describe('clearRuins', () => {
  it('бесплатно освобождает клетку, ранг теряется; продажа руин отклоняется', () => {
    const s = setup()
    s.ruin()
    const money = s.battle.state.money
    s.dispatch({ type: 'sellTower', towerId: s.tower.id })
    expect(s.reasons()).toEqual(['notBuilding'])
    s.dispatch({ type: 'clearRuins', towerId: s.tower.id })
    expect(s.of('ruinsCleared')[0]).toMatchObject({ cell: { x: 3, y: 1 } })
    expect(s.battle.state.money).toBe(money)
    expect(s.battle.state.towers).toHaveLength(0)
    s.dispatch({ type: 'placeTower', towerType: 'machineGun', cell: { x: 3, y: 1 } })
    expect(s.battle.state.towers[0]).toMatchObject({ rank: 0, xp: 0 })
    expect(s.reasons()).toEqual(['notBuilding'])
  })

  it('снимает заказ восстановления и освобождает очередь', () => {
    const s = setup()
    s.ruin()
    s.battle.state.money = 0
    s.dispatch({ type: 'restoreTower', towerId: s.tower.id })
    s.dispatch({ type: 'placeTower', towerType: 'machineGun', cell: { x: 6, y: 1 } })
    s.battle.state.money = 100
    s.battle.step(3)
    expect(s.battle.state.towers[1]!.phase).toBe('queued')
    s.dispatch({ type: 'clearRuins', towerId: s.tower.id })
    expect(s.battle.state.towers[0]!.phase).toBe('building')
  })
})

describe('реплей', () => {
  it('новые команды записываются и проигрываются детерминированно', () => {
    const battle = createBattle({ seed: 9, level, startMoney: 9999 })
    const rec = recordCommands(battle)
    battle.dispatch({ type: 'placeTower', towerType: 'machineGun', cell: { x: 3, y: 1 } })
    battle.step(60)
    battle.dispatch({ type: 'startWave' })
    battle.dispatch({ type: 'spawnEnemies', enemyType: 'boss', count: 3, spacing: 1 })
    // ждём, пока боссы разрушат башню
    // чиним один раз: непрерывный ремонт быстрее урона боссов и башня не упала бы
    let repaired = false
    for (let i = 0; i < 1500 && !battle.state.towers.some((t) => t.phase === 'ruins'); i++) {
      battle.step()
      const hurt = battle.state.towers.find((t) => t.repairCost > 0 && t.repairTicksLeft === 0)
      if (hurt && !repaired) {
        battle.dispatch({ type: 'repairTower', towerId: hurt.id })
        repaired = true
      }
    }
    const ruins = battle.state.towers.find((t) => t.phase === 'ruins')!
    expect(ruins).toBeDefined()
    battle.dispatch({ type: 'restoreTower', towerId: ruins.id })
    battle.step(100)
    const again = battle.state.towers.find((t) => t.phase === 'ruins')
    if (again) battle.dispatch({ type: 'clearRuins', towerId: again.id })
    battle.step(50)
    const replay = JSON.parse(JSON.stringify(rec.replay()))
    const types = replay.commands.map((c: { cmd: { type: string } }) => c.cmd.type)
    expect(types).toContain('repairTower')
    expect(types).toContain('restoreTower')
    expect(hashState(runReplay(replay, level, battle.state.tick).state)).toBe(
      hashState(battle.state),
    )
  })
})
