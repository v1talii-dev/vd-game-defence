import { TICK_RATE } from '@/shared/config'
import {
  RANKS,
  SELL_REFUND_RATIO,
  TOWERS,
  type TargetPriority,
  type TowerType,
} from '../config/towers'

export type TowerLevel = 1 | 2 | 3
export const MAX_TOWER_LEVEL: TowerLevel = 3

// queued — заказ ждёт оплаты, building — строится, upgrading — улучшается, active — работает
export type TowerPhase = 'queued' | 'building' | 'upgrading' | 'active'

export interface TowerState {
  id: number
  type: TowerType
  cell: { x: number; y: number }
  // центр клетки, в клетках
  x: number
  y: number
  level: TowerLevel
  xp: number
  // индекс в RANKS: 0 — рядовой … 3 — герой
  rank: number
  // всего вложено кредитов (постройка + апгрейды)
  invested: number
  // тиков до следующего выстрела
  cooldown: number
  priority: TargetPriority
  // последняя цель, для debug-оверлея
  targetId: number | null
  phase: TowerPhase
  // всего тиков текущей стройки/улучшения (0 у queued и active)
  phaseTicksTotal: number
  // осталось тиков (0 в active)
  phaseTicksLeft: number
  // прогресс стройки/улучшения 0..1 (queued — 0, active — 1)
  progress: number
  // кредиты, оплаченные за текущую стройку/улучшение (возвращаются при отмене)
  phasePaid: number
  // номер в общей FIFO-очереди (из state.nextId) у башни с заказанным, но неоплаченным улучшением; иначе null
  upgradeOrder: number | null
}

export interface TowerStats {
  damage: number
  reloadTicks: number
  range: number
}

export function rankForXp(xp: number): number {
  let rank = 0
  RANKS.forEach((r, i) => {
    if (xp >= r.xp) rank = i
  })
  return rank
}

export function towerStats(type: TowerType, level: TowerLevel, rank: number): TowerStats {
  const base = TOWERS[type].levels[(level - 1) as 0 | 1 | 2]
  const r = RANKS[rank] ?? RANKS[0]
  return {
    damage: base.damage * r.damage,
    reloadTicks: Math.max(1, Math.round((base.reload * TICK_RATE) / r.fireRate)),
    range: base.range * r.range,
  }
}

// цена следующего уровня или null, если уровень максимальный
export function upgradeCost(type: TowerType, level: TowerLevel): number | null {
  return level >= MAX_TOWER_LEVEL ? null : TOWERS[type].levels[level as 1 | 2].cost
}

export function buildTicks(type: TowerType): number {
  return Math.round(TOWERS[type].buildSeconds * TICK_RATE)
}

// тиков улучшения с уровня level на следующий
export function upgradeTicks(type: TowerType, level: 1 | 2): number {
  return Math.round(TOWERS[type].upgradeSeconds[level - 1]! * TICK_RATE)
}

export function sellRefund(invested: number): number {
  return Math.floor(invested * SELL_REFUND_RATIO)
}

export interface TargetCandidate {
  id: number
  x: number
  y: number
  // пройдено по пути
  distance: number
  hp: number
  air: boolean
}

export function selectTarget<T extends TargetCandidate>(
  tower: { type: TowerType; x: number; y: number; priority: TargetPriority },
  range: number,
  candidates: readonly T[],
): T | null {
  const cfg = TOWERS[tower.type]
  let best: T | null = null
  let bestScore = -Infinity
  for (const c of candidates) {
    if (c.air ? !cfg.targetsAir : !cfg.targetsGround) continue
    const d = Math.hypot(c.x - tower.x, c.y - tower.y)
    if (d > range || d < cfg.minRange) continue
    // при равенстве побеждает тот, кто дальше по пути (порядок кандидатов не влияет)
    const score =
      tower.priority === 'strongest'
        ? c.hp * 1e6 + c.distance
        : tower.priority === 'closest'
          ? -d * 1e6 + c.distance
          : c.distance
    if (score > bestScore) {
      best = c
      bestScore = score
    }
  }
  return best
}
