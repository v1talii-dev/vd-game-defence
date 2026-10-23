import {
  ENEMIES,
  advanceEnemy,
  createEnemy,
  ENEMY_MUZZLE_HEIGHT,
  ENEMY_SHELL_SPEED,
  createPathGeometry,
  type ArmorType,
  type EnemyConfig,
  type EnemyState,
  type EnemyType,
} from '@/entities/enemy/@x/battle'
import {
  advanceProjectile,
  createProjectile,
  type ProjectileState,
} from '@/entities/projectile/@x/battle'
import {
  FREE_REFUND_SECONDS,
  TOWERS,
  rankForXp,
  regenPerTick,
  towerMaxHp,
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
import { DAMAGE_MATRIX, HQ_HP, PREP_SECONDS, STAR_THRESHOLDS, START_MONEY } from '../config/battle'
import type {
  Battle,
  BattleEvent,
  BattleOptions,
  BattleState,
  Command,
  RejectReason,
} from './types'

const PREP_TICKS = PREP_SECONDS * TICK_RATE
// высота центра башни: точка попадания снаряда shell
const TOWER_HIT_HEIGHT = 0.5
// дуга снаряда shell: доля дистанции (SPEC §4.7)
const SHELL_ARC_FACTOR = 0.15
const PRIORITIES: readonly TargetPriority[] = ['first', 'strongest', 'closest']

export function damageMultiplier(damageType: DamageType, armor: ArmorType): number {
  return DAMAGE_MATRIX[damageType][armor]
}

export function starsForHp(hp: number): 1 | 2 | 3 {
  return hp >= STAR_THRESHOLDS.three ? 3 : hp >= STAR_THRESHOLDS.two ? 2 : 1
}

export function createBattle(opts: BattleOptions): Battle {
  const { level, config } = opts
  const startMoney = opts.startMoney ?? config?.startMoney ?? START_MONEY
  const waves = config?.waves
  const waveCount = waves?.length ?? WAVE_COUNT
  const hpScale = config?.hpScale ?? 1
  const startWave = Math.max(1, Math.min(waveCount, Math.floor(opts.startWave ?? 1)))
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
    hqHp: config?.hqHp ?? HQ_HP,
    wave: {
      number: startWave - 1,
      total: waveCount,
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

  // башню можно бить в active и upgrading; building/queued неуязвимы, ruins — не цель
  const targetable = (t: TowerState) => t.phase === 'active' || t.phase === 'upgrading'

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

  const hasOrders = () => state.towers.some((t) => t.phase === 'queued' || t.upgradeOrder !== null)

  function startUpgrade(tower: TowerState, cost: number) {
    const ticks = upgradeTicks(tower.type, tower.level as 1 | 2)
    tower.phase = 'upgrading'
    tower.phaseTicksTotal = tower.phaseTicksLeft = ticks
    tower.progress = 0
    tower.phasePaid = cost
    tower.paidTick = state.tick
    tower.invested += cost
    emit({ type: 'towerUpgradeStarted', towerId: tower.id, toLevel: tower.level + 1, cost, ticks })
    addMoney(-cost)
  }

  // оплата заказов строго по порядку: пока первый не оплачен, следующие ждут
  function payQueue() {
    // общая FIFO: queued-башни по id и заказы улучшений по upgradeOrder
    const orders = state.towers
      .filter((t) => t.phase === 'queued' || (t.phase === 'active' && t.upgradeOrder !== null))
      .sort((a, b) => (a.upgradeOrder ?? a.id) - (b.upgradeOrder ?? b.id))
    for (const tower of orders) {
      if (tower.phase === 'active') {
        const upCost = upgradeCost(tower.type, tower.level)
        if (upCost === null) return
        if (state.money < upCost) return
        tower.upgradeOrder = null
        startUpgrade(tower, upCost)
        continue
      }
      const cost = TOWERS[tower.type].levels[0].cost
      if (state.money < cost) return
      const ticks = buildTicks(tower.type)
      tower.phase = 'building'
      tower.phaseTicksTotal = tower.phaseTicksLeft = ticks
      tower.progress = 0
      tower.phasePaid = tower.invested = cost
      tower.paidTick = state.tick
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
        // улучшение полностью лечит
        tower.maxHp = towerMaxHp(tower.type, tower.level, tower.rank)
        tower.hp = tower.maxHp
        emit({ type: 'towerUpgraded', towerId: tower.id, level: tower.level, cost })
      }
    }
  }

  // 100% вне волны или в окне FREE_REFUND_SECONDS после оплаты, иначе 70%
  function currentRefund(tower: TowerState): number {
    const free =
      state.wave.phase === 'prep' || state.tick - tower.paidTick <= FREE_REFUND_SECONDS * TICK_RATE
    return free ? tower.invested : sellRefund(tower.invested)
  }

  function apply(cmd: Command) {
    switch (cmd.type) {
      case 'placeTower': {
        if (!Object.hasOwn(TOWERS, cmd.towerType)) return reject(cmd, 'unknownTowerType')
        if (config && !config.allowedTowers.includes(cmd.towerType))
          return reject(cmd, 'towerNotAllowed')
        const { x, y } = cmd.cell ?? { x: NaN, y: NaN }
        if (!buildable.has(`${x},${y}`)) return reject(cmd, 'notBuildable')
        if (state.towers.some((t) => t.cell.x === x && t.cell.y === y))
          return reject(cmd, 'cellOccupied')
        const cost = TOWERS[cmd.towerType].levels[0].cost
        // нехватка денег не отказ: заказ встаёт в очередь (FIFO), клетка занята
        const waiting = state.money < cost || hasOrders()
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
          upgradeOrder: null,
          paidTick: 0,
          sellRefund: 0,
          hp: towerMaxHp(cmd.towerType, 1, 0),
          maxHp: towerMaxHp(cmd.towerType, 1, 0),
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
        if (tower.phase === 'upgrading' || tower.upgradeOrder !== null)
          return reject(cmd, 'alreadyUpgrading')
        if (tower.phase !== 'active') return reject(cmd, 'stillBuilding')
        const cost = upgradeCost(tower.type, tower.level)
        if (cost === null) return reject(cmd, 'maxLevel')
        // нехватка денег или непустая очередь — заказ встаёт в общую FIFO
        if (state.money < cost || hasOrders()) {
          tower.upgradeOrder = state.nextId++
          return emit({
            type: 'towerUpgradeOrdered',
            towerId: tower.id,
            toLevel: tower.level + 1,
            cost,
            waiting: true,
          })
        }
        return startUpgrade(tower, cost)
      }
      case 'cancelUpgrade': {
        const tower = findTower(cmd.towerId)
        if (!tower) return reject(cmd, 'towerNotFound')
        if (tower.upgradeOrder !== null) {
          // заказ не оплачен — возврата нет
          tower.upgradeOrder = null
          emit({ type: 'towerUpgradeCancelled', towerId: tower.id, refund: 0 })
          return payQueue()
        }
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
        if (tower.upgradeOrder !== null) {
          tower.upgradeOrder = null
          emit({ type: 'towerUpgradeCancelled', towerId: tower.id, refund: 0 })
        }
        const refund = currentRefund(tower)
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
    const enemy = createEnemy(state.nextId++, type, geom, distance, hpScale)
    state.enemies.push(enemy)
    emit({ type: 'enemySpawned', enemyId: enemy.id, enemyType: type })
  }

  function updateWave() {
    const w = state.wave
    if (w.phase === 'prep') {
      if (--w.prepTicksLeft <= 0) startNextWave(false)
      else return
    }
    const schedule = waveSchedule(w.number, waves)
    while (w.spawnIndex < schedule.length && schedule[w.spawnIndex]!.tick <= w.elapsedTicks) {
      spawn(schedule[w.spawnIndex++]!.enemy as EnemyType)
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
        const oldMax = tower.maxHp
        tower.rank = rank
        tower.maxHp = towerMaxHp(tower.type, tower.level, rank)
        // текущее HP растёт на ту же разницу — доля не теряется
        tower.hp += tower.maxHp - oldMax
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

  // враг с towerAttack: закреплённая цель, иначе ближайшая башня в радиусе (ничья — меньший id)
  function pickTower(e: EnemyState, range: number): TowerState | null {
    const r2 = range * range
    const dist2 = (t: TowerState) => (t.x - e.x) ** 2 + (t.y - e.y) ** 2
    const sticky = e.towerTargetId === null ? undefined : findTower(e.towerTargetId)
    if (sticky && targetable(sticky) && dist2(sticky) <= r2) return sticky
    let best: TowerState | null = null
    let bestD = Infinity
    for (const t of state.towers) {
      if (!targetable(t)) continue
      const d = dist2(t)
      if (d > r2 || d > bestD || (d === bestD && best !== null && best.id < t.id)) continue
      best = t
      bestD = d
    }
    return best
  }

  function enemiesAttack() {
    for (const e of state.enemies) {
      const atk = (ENEMIES[e.type] as EnemyConfig).towerAttack
      if (!atk) continue
      if (e.towerCooldown > 0) {
        e.towerCooldown--
        continue
      }
      const tower = pickTower(e, atk.range)
      e.towerTargetId = tower?.id ?? null
      if (!tower) continue
      const p = createProjectile({
        id: state.nextId++,
        towerId: 0,
        hostile: true,
        attackerId: e.id,
        targetId: tower.id,
        kind: 'shell',
        from: { x: e.x, y: e.y, z: ENEMY_MUZZLE_HEIGHT },
        aim: { x: tower.x, y: tower.y, z: TOWER_HIT_HEIGHT },
        speed: ENEMY_SHELL_SPEED,
        arcFactor: SHELL_ARC_FACTOR,
        minArc: 0,
        damage: atk.damage,
        damageType: 'shell',
      })
      state.projectiles.push(p)
      e.towerCooldown = Math.max(1, Math.round(atk.reload * TICK_RATE)) - 1
      emit({ type: 'enemyFired', projectileId: p.id, enemyId: e.id, towerId: tower.id })
    }
  }

  function damageTower(tower: TowerState, p: ProjectileState) {
    const amount = Math.min(tower.hp, p.damage)
    tower.hp -= amount
    emit({
      type: 'towerDamaged',
      towerId: tower.id,
      amount,
      hp: tower.hp,
      attackerId: p.attackerId,
    })
    if (tower.hp > 0) return
    // улучшение в процессе сгорает вместе с башней (вложения остаются в invested); заказ улучшения снимается
    if (tower.upgradeOrder !== null) {
      tower.upgradeOrder = null
      emit({ type: 'towerUpgradeCancelled', towerId: tower.id, refund: 0 })
    }
    endPhase(tower)
    tower.phase = 'ruins'
    tower.cooldown = 0
    tower.targetId = null
    emit({ type: 'towerDestroyed', towerId: tower.id, x: tower.x, y: tower.y })
    // снятый заказ улучшения мог освободить очередь
    payQueue()
  }

  function regenTowers() {
    for (const t of state.towers) {
      if (!targetable(t) || t.hp >= t.maxHp) continue
      t.hp = Math.min(t.maxHp, t.hp + regenPerTick(t.rank, t.maxHp))
    }
  }

  function moveProjectiles() {
    state.projectiles = state.projectiles.filter((p) => {
      if (p.hostile) {
        // цель разрушена или продана в полёте — снаряд пропадает без урона
        const tower = findTower(p.targetId)
        if (!tower || !targetable(tower)) return false
        if (!advanceProjectile(p)) return true
        emit({ type: 'projectileImpact', x: p.x, y: p.y, z: p.z, kind: p.kind, targetId: tower.id })
        damageTower(tower, p)
        return false
      }
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
    if (w.spawnIndex < waveSchedule(w.number, waves).length) return
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
    enemiesAttack()
    moveProjectiles()
    regenTowers()
    checkWaveCleared()
    for (const tower of state.towers)
      tower.sellRefund = tower.phase === 'ruins' ? 0 : currentRefund(tower)
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
