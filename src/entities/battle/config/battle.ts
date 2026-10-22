import type { ArmorType } from '@/entities/enemy/@x/battle'
import type { DamageType } from '@/entities/tower/@x/battle'

export const START_MONEY = 600
export const HQ_HP = 20
// пауза перед каждой волной, включая первую
export const PREP_SECONDS = 15

// SPEC §4.1: 3 звезды при HP ≥ 18, 2 при HP ≥ 10, 1 при HP > 0
export const STAR_THRESHOLDS = { three: 18, two: 10 } as const

// SPEC §4.2: модификатор[тип урона][тип брони]
export const DAMAGE_MATRIX = {
  bullet: { infantry: 1, light: 0.6, tank: 0.25, air: 0.75 },
  rocket: { infantry: 0.4, light: 1, tank: 1.25, air: 1 },
} as const satisfies Record<DamageType, Record<ArmorType, number>>
