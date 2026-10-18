export type TowerType = 'machineGun' | 'rocket' | 'mortar' | 'antiAir'
export type DamageType = 'bullet' | 'rocket' | 'explosive' | 'antiAir'
export type TargetPriority = 'first' | 'strongest' | 'closest'

export interface TowerLevelStats {
  // цена перехода на этот уровень (для 1-го — цена постройки)
  readonly cost: number
  readonly damage: number
  // секунд между выстрелами
  readonly reload: number
  // в клетках
  readonly range: number
}

export interface TowerConfig {
  readonly damageType: DamageType
  readonly targetsGround: boolean
  readonly targetsAir: boolean
  // клеток в секунду
  readonly projectileSpeed: number
  // радиус сплэша в клетках, 0 — одиночная цель
  readonly splash: number
  // мёртвая зона в клетках
  readonly minRange: number
  readonly levels: readonly [TowerLevelStats, TowerLevelStats, TowerLevelStats]
}

export const TOWERS = {
  machineGun: {
    damageType: 'bullet',
    targetsGround: true,
    targetsAir: true,
    projectileSpeed: 16,
    splash: 0,
    minRange: 0,
    levels: [
      { cost: 100, damage: 7, reload: 0.25, range: 3.5 },
      { cost: 90, damage: 11, reload: 0.22, range: 3.75 },
      { cost: 140, damage: 16, reload: 0.2, range: 4 },
    ],
  },
  rocket: {
    damageType: 'rocket',
    targetsGround: true,
    targetsAir: true,
    projectileSpeed: 9,
    splash: 0,
    minRange: 0,
    levels: [
      { cost: 175, damage: 45, reload: 1.2, range: 4 },
      { cost: 140, damage: 70, reload: 1.1, range: 4.5 },
      { cost: 200, damage: 105, reload: 1, range: 5 },
    ],
  },
  mortar: {
    damageType: 'explosive',
    targetsGround: true,
    targetsAir: false,
    projectileSpeed: 7,
    splash: 1.5,
    minRange: 1.5,
    levels: [
      { cost: 250, damage: 40, reload: 2.5, range: 6 },
      { cost: 160, damage: 60, reload: 2.3, range: 6.5 },
      { cost: 220, damage: 90, reload: 2.1, range: 7 },
    ],
  },
  antiAir: {
    damageType: 'antiAir',
    targetsGround: false,
    targetsAir: true,
    projectileSpeed: 14,
    splash: 0,
    minRange: 0,
    levels: [
      { cost: 200, damage: 18, reload: 0.5, range: 4.5 },
      { cost: 120, damage: 28, reload: 0.45, range: 5 },
      { cost: 160, damage: 40, reload: 0.4, range: 5.5 },
    ],
  },
} as const satisfies Record<TowerType, TowerConfig>

export const TOWER_TYPES = Object.keys(TOWERS) as TowerType[]

export type RankId = 'private' | 'veteran' | 'elite' | 'hero'

export interface RankConfig {
  readonly id: RankId
  readonly xp: number
  readonly damage: number
  readonly fireRate: number
  readonly range: number
}

// SPEC §4.4: опыт за убийство = награда за врага
export const RANKS = [
  { id: 'private', xp: 0, damage: 1, fireRate: 1, range: 1 },
  { id: 'veteran', xp: 150, damage: 1.1, fireRate: 1, range: 1 },
  { id: 'elite', xp: 400, damage: 1.2, fireRate: 1.1, range: 1 },
  { id: 'hero', xp: 900, damage: 1.35, fireRate: 1.2, range: 1.1 },
] as const satisfies readonly RankConfig[]

// доля вложенных денег, возвращаемая при продаже
export const SELL_REFUND_RATIO = 0.7
