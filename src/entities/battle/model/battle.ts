import {
  ENEMIES,
  advanceEnemy,
  createEnemy,
  createPathGeometry,
  type ArmorType,
  type EnemyState,
  type EnemyType,
} from '@/entities/enemy/@x/battle'
import { advanceProjectile, createProjectile, type ProjectileState } from '@/entities/projectile/@x/battle'
import {
  TOWERS,
  rankForXp,
  selectTarget,
  sellRefund,
  towerStats,
  upgradeCost,
  buildTicks,
  upgradeTicks,
  type DamageType,
  type TargetPriority,
  type TowerState,
} from '@/entities/tower/@x/battle'
import { WAVE_COUNT, waveSchedule } from '@/entities/wave/@x/battle'
import { TICK_RATE } from '@/shared/config'
import { createEmitter, seedRng } from '@/shared/lib/sim'
import {
  DAMAGE_MATRIX,
  HQ_HP,
  PREP_SECONDS,
  STAR_THRESHOLDS,
  START_MONEY,
} from '../config/battle'
import type {
  Battle,
  BattleEvent,
  BattleOptions,
  BattleState,
  Command,
  RejectReason,
} from './types'

const PREP_TICKS = PREP_SECONDS * TICK_RATE
const PRIORITIES: readonly TargetPriority[] = ['first', 'strongest', 'closest']

export function damageMultiplier(damageType: DamageType, armor: ArmorType): number {
  return DAMAGE_MATRIX[damageType][armor]
}

export function starsForHp(hp: number): 1 | 2 | 3 {
  return hp >= STAR_THRESHOLDS.three ? 3 : hp >= STAR_THRESHOLDS.two ? 2 : 1
}

export function createBattle(opts: BattleOptions): Battle {
  const { level } = opts
  const startMoney = opts.startMoney ?? START_MONEY
  const startWave = Math.max(1, Math.min(WAVE_COUNT, Math.floor(opts.startWave ?? 1)))
  const geom = createPathGeometry(level.path)
  const buildable = new Set(level.buildable.map((c) => `${c.x},${c.y}`))
  const emitter = createEmitter<BattleEvent>()
  const emit = (e: BattleEvent) => emitter.emit(e)
  const queue: Command[] = []

  const state: BattleState = {
    seed: opts.seed,
    levelId: level.id,
    tick: 0,
    rng: seedRng(opts.seed),
    nextId: 1,
    money: startMoney,
    hqHp: HQ_HP,
    wave: {
      number: startWave - 1,
      total: WAVE_COUNT,
      phase: 'prep',
      prepTicksLeft: PREP_TICKS,
      elapsedTicks: 0,
      spawnIndex: 0,
    },
    towers: [],
    enemies: [],
    projectiles: [],
    outcome: null,
  }

  function addMoney(delta: number) {
    if (delta === 0) return
    state.money += delta
    emit({ type: 'moneyChanged', money: state.money, delta })
  }

  function reject(cmd: Command, reason: RejectReason) {
    emit({ type: 'commandRejected', cmd, reason })
  }

  function findTower(id: number): TowerState | undefined {
    return state.towers.find((t) => t.id === id)
  }

  function endPhase(tower: TowerState) {
    tower.phase = 'active'
    tower.phaseTicksTotal = tower.phaseTicksLeft = tower.phasePaid = 0
    tower.progress = 1
  }

  function cancelBuild(cmd: Command, towerId: number) {
    const tower = findTower(towerId)
    if (!tower) return reject(cmd, 'towerNotFound')
    if (tower.phase !== 'queued' && tower.phase !== 'building') return reject(cmd, 'notBuilding')
    const refund = tower.phasePaid
    state.towers = state.towers.filter((t) => t !== tower)
    emit({ type: 'towerBuildCancelled', towerId, refund })
    addMoney(refund)
    // освободившиеся деньги могут оплатить следующий заказ
    payQueue()
  }

  // оплата заказов строго по порядку: пока первый не оплачен, следующие ждут
  function payQueue() {
    for (const tower of state.towers) {
      if (tower.phase !== 'queued') continue
      const cost = TOWERS[tower.type].levels[0].cost
      if (state.money < cost) return
      const ticks = buildTicks(tower.type)
      tower.phase = 'building'
      tower.phaseTicksTotal = tower.phaseTicksLeft = ticks
      tower.progress = 0
      tower.phasePaid = tower.invested = cost
      emit({ type: 'towerBuildStarted', towerId: tower.id, cost, ticks })
      addMoney(-cost)
    }
  }

  // завершение ровно через phaseTicksTotal тиков после старта
  function advanceConstruction() {
    for (const tower of state.towers) {
      if (tower.phase !== 'building' && tower.phase !== 'upgrading') continue
      tower.phaseTicksLeft--
      tower.progress = 1 - tower.phaseTicksLeft / tower.phaseTicksTotal
      if (tower.phaseTicksLeft > 0) continue
      const wasBuilding = tower.phase === 'building'
      const cost = tower.phasePaid
      endPhase(tower)
      if (wasBuilding) emit({ type: 'towerBuilt', towerId: tower.id })
      else {
        tower.level++
        emit({ type: 'towerUpgraded', towerId: tower.id, level: tower.level, cost })
      }
    }
  }

  function apply(cmd: Command) {
    switch (cmd.type) {
      case 'placeTower': {
        if (!Object.hasOwn(TOWERS, cmd.towerType)) return reject(cmd, 'unknownTowerType')
        const { x, y } = cmd.cell ?? { x: NaN, y: NaN }
        if (!buildable.has(`${x},${y}`)) return reject(cmd, 'notBuildable')
        if (state.towers.some((t) => t.cell.x === x && t.cell.y === y))
          return reject(cmd, 'cellOccupied')
        const cost = TOWERS[cmd.towerType].levels[0].cost
        // нехватка денег не отказ: заказ встаёт в очередь (FIFO), клетка занята
        const waiting = state.money < cost || state.towers.some((t) => t.phase === 'queued')
        const tower: TowerState = {
          id: state.nextId++,
          type: cmd.towerType,
          cell: { x, y },
          x: x + 0.5,
          y: y + 0.5,
          level: 1,
          xp: 0,
          rank: 0,
          invested: 0,
          cooldown: 0,
          priority: 'first',
          targetId: null,
          phase: 'queued',
          phaseTicksTotal: 0,
          phaseTicksLeft: 0,
          progress: 0,
          phasePaid: 0,
        }
        state.towers.push(tower)
        emit({
          type: 'towerPlaced',
          towerId: tower.id,
          towerType: tower.type,
          cell: { ...tower.cell },
          cost,
        })
        emit({
          type: 'towerOrdered',
          towerId: tower.id,
          towerType: tower.type,
          cell: { ...tower.cell },
          waiting,
        })
        return payQueue()
      }
      case 'upgradeTower': {
        const tower = findTower(cmd.towerId)
        if (!tower) return reject(cmd, 'towerNotFound')
        if (tower.phase === 'upgrading') return reject(cmd, 'alreadyUpgrading')
        if (tower.phase !== 'active') return reject(cmd, 'stillBuilding')
        const cost = upgradeCost(tower.type, tower.level)
        if (cost === null) return reject(cmd, 'maxLevel')
        if (state.money < cost) return reject(cmd, 'notEnoughMoney')
        const ticks = upgradeTicks(tower.type, tower.level as 1 | 2)
        tower.phase = 'upgrading'
        tower.phaseTicksTotal = tower.phaseTicksLeft = ticks
        tower.progress = 0
        tower.phasePaid = cost
        tower.invested += cost
        emit({
          type: 'towerUpgradeStarted',
          towerId: tower.id,
          toLevel: tower.level + 1,
          cost,
          ticks,
        })
        return addMoney(-cost)
      }
      case 'cancelUpgrade': {
        const tower = findTower(cmd.towerId)
        if (!tower) return reject(cmd, 'towerNotFound')
        if (tower.phase !== 'upgrading') return reject(cmd, 'notUpgrading')
        const refund = tower.phasePaid
        tower.invested -= refund
        endPhase(tower)
        emit({ type: 'towerUpgradeCancelled', towerId: tower.id, refund })
        return addMoney(refund)
      }
      case 'cancelBuild':
        return cancelBuild(cmd, cmd.towerId)
      case 'sellTower': {
        const tower = findTower(cmd.towerId)
        if (!tower) return reject(cmd, 'towerNotFound')
        if (tower.phase === 'upgrading') return reject(cmd, 'upgradeInProgress')
        // продажа строящейся башни = отмена с возвратом 100%
        if (tower.phase !== 'active') return cancelBuild(cmd, cmd.towerId)
        const refund = sellRefund(tower.invested)
        state.towers = state.towers.filter((t) => t !== tower)
        emit({ type: 'towerSold', towerId: tower.id, refund })
        return addMoney(refund)
      }
      case 'startWave': {
        if (state.wave.phase === 'active') return reject(cmd, 'waveInProgress')
        if (state.wave.number >= state.wave.total) return reject(cmd, 'noMoreWaves')
        return startNextWave(true)
      }
      case 'setTargetPriority': {
        const tower = findTower(cmd.towerId)
        if (!tower) return reject(cmd, 'towerNotFound')
        if (!PRIORITIES.includes(cmd.priority)) return reject(cmd, 'invalidPriority')
        tower.priority = cmd.priority
        return emit({ type: 'targetPriorityChanged', towerId: tower.id, priority: cmd.priority })
      }
      case 'grantMoney': {
        if (!Number.isInteger(cmd.amount) || cmd.amount <= 0) return reject(cmd, 'invalidAmount')
        return addMoney(cmd.amount)
      }
      case 'spawnEnemies': {
        if (!Object.hasOwn(ENEMIES, cmd.enemyType)) return reject(cmd, 'unknownEnemyType')
        const { count, spacing = 0.5 } = cmd
        if (!Number.isInteger(count) || count <= 0 || count > 1000 || !(spacing >= 0))
          return reject(cmd, 'invalidAmount')
        for (let i = 0; i < count; i++) spawn(cmd.enemyType, Math.min(i * spacing, geom.length / 2))
        return
      }
      default:
        return reject(cmd, 'unknownCommand')
    }
  }

  function startNextWave(early: boolean) {
    const w = state.wave
    const bonus = early ? Math.floor(w.prepTicksLeft / TICK_RATE) * (w.number + 1) : 0
    w.number++
    w.phase = 'active'
    w.prepTicksLeft = 0
    w.elapsedTicks = 0
    w.spawnIndex = 0
    emit({ type: 'waveStarted', wave: w.number, total: w.total, early, bonus })
    addMoney(bonus)
  }

  function spawn(type: EnemyType, distance = 0) {
    const enemy = createEnemy(state.nextId++, type, geom, distance)
    state.enemies.push(enemy)
    emit({ type: 'enemySpawned', enemyId: enemy.id, enemyType: type })
  }

  function updateWave() {
    const w = state.wave
    if (w.phase === 'prep') {
      if (--w.prepTicksLeft <= 0) startNextWave(false)
      else return
    }
    const schedule = waveSchedule(w.number)
    while (w.spawnIndex < schedule.length && schedule[w.spawnIndex]!.tick <= w.elapsedTicks) {
      spawn(schedule[w.spawnIndex++]!.enemy)
    }
    w.elapsedTicks++
  }

  function moveEnemies() {
    state.enemies = state.enemies.filter((e) => {
      if (!advanceEnemy(e, geom)) return true
      if (state.outcome) return false
      const damage = Math.min(state.hqHp, ENEMIES[e.type].leak)
      state.hqHp -= damage
      emit({ type: 'enemyLeaked', enemyId: e.id, enemyType: e.type, damage })
      emit({ type: 'hqHpChanged', hp: state.hqHp, delta: -damage })
      if (state.hqHp <= 0) {
        state.outcome = { result: 'defeat' }
        emit({ type: 'defeat', wave: state.wave.number })
      }
      return false
    })
  }

  // центр хитбокса цели
  function aimPoint(e: EnemyState) {
    return { x: e.x, y: e.y, z: e.z + ENEMIES[e.type].hitHeight / 2 }
  }

  function fire(tower: TowerState) {
    if (tower.phase !== 'active') {
      tower.targetId = null
      return
    }
    if (tower.cooldown > 0) {
      tower.cooldown--
      return
    }
    const stats = towerStats(tower.type, tower.level, tower.rank)
    const target = selectTarget(tower, stats.range, state.enemies)
    tower.targetId = target?.id ?? null
    if (!target) return
    const cfg = TOWERS[tower.type]
    const p: ProjectileState = createProjectile({
      id: state.nextId++,
      towerId: tower.id,
      targetId: target.id,
      kind: cfg.projectile.kind,
      from: { x: tower.x, y: tower.y, z: cfg.muzzleHeight },
      aim: aimPoint(target),
      speed: cfg.projectileSpeed,
      arcFactor: cfg.projectile.arcFactor,
      minArc: cfg.projectile.minArc,
      damage: stats.damage,
      damageType: cfg.damageType,
    })
    state.projectiles.push(p)
    tower.cooldown = stats.reloadTicks - 1
    emit({ type: 'projectileFired', projectileId: p.id, towerId: tower.id, targetId: target.id })
  }

  function damageEnemy(e: EnemyState, p: ProjectileState) {
    if (e.hp <= 0) return
    const cfg = ENEMIES[e.type]
    e.hp -= p.damage * damageMultiplier(p.damageType as DamageType, cfg.armor)
    if (e.hp <= 0) {
      e.hp = 0
      addMoney(cfg.reward)
      emit({
        type: 'enemyKilled',
        enemyId: e.id,
        enemyType: e.type,
        towerId: p.towerId,
        reward: cfg.reward,
      })
      // опыт получает только башня, которая ещё стоит
      const tower = findTower(p.towerId)
      if (!tower || tower.phase !== 'active') return
      tower.xp += cfg.reward
      const rank = rankForXp(tower.xp)
      if (rank > tower.rank) {
        tower.rank = rank
        emit({ type: 'towerRankUp', towerId: tower.id, rank })
      }
      return
    }
    const minions = 'spawnOnHalfHp' in cfg ? cfg.spawnOnHalfHp : undefined
    if (minions && !e.spawnedMinions && e.hp < e.maxHp / 2) {
      e.spawnedMinions = true
      for (let i = 0; i < minions.count; i++) spawn(minions.type, Math.max(0, e.distance - 0.3 * i))
    }
  }

  function moveProjectiles() {
    state.projectiles = state.projectiles.filter((p) => {
      const target = state.enemies.find((e) => e.id === p.targetId && e.hp > 0)
      if (!advanceProjectile(p, target && aimPoint(target))) return true
      emit({ type: 'projectileImpact', x: p.x, y: p.y, z: p.z, kind: p.kind, targetId: p.targetId })
      // цель погибла в полёте — долетели до последней точки без урона
      if (target) damageEnemy(target, p)
      return false
    })
    state.enemies = state.enemies.filter((e) => e.hp > 0)
  }

  function checkWaveCleared() {
    const w = state.wave
    if (w.phase !== 'active' || state.enemies.length > 0) return
    if (w.spawnIndex < waveSchedule(w.number).length) return
    emit({ type: 'waveCleared', wave: w.number })
    if (w.number >= w.total) {
      const stars = starsForHp(state.hqHp)
      state.outcome = { result: 'victory', stars }
      emit({ type: 'victory', stars, hqHp: state.hqHp })
      return
    }
    w.phase = 'prep'
    w.prepTicksLeft = PREP_TICKS
  }

  function tick() {
    if (state.outcome) {
      queue.length = 0
      return
    }
    state.tick++
    advanceConstruction()
    for (const cmd of queue.splice(0)) {
      emit({ type: 'commandApplied', tick: state.tick, cmd })
      apply(cmd)
    }
    payQueue()
    updateWave()
    moveEnemies()
    if (state.outcome) return
    for (const tower of state.towers) fire(tower)
    moveProjectiles()
    checkWaveCleared()
  }

  return {
    state,
    init: { seed: opts.seed, levelId: level.id, startMoney, startWave },
    dispatch: (cmd) => void queue.push(cmd),
    step(n = 1) {
      for (let i = 0; i < n; i++) tick()
    },
    on: (type, handler) => emitter.on(type, handler),
  }
}
