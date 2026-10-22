export type EnemyType = 'grunt' | 'grenadier' | 'technical' | 'tank' | 'drone' | 'boss'
export type ArmorType = 'infantry' | 'light' | 'tank' | 'air'

export interface EnemyConfig {
  readonly armor: ArmorType
  readonly hp: number
  // клеток в секунду
  readonly speed: number
  // кредиты и опыт башне за убийство
  readonly reward: number
  // урон штабу при прорыве
  readonly leak: number
  // высота хитбокса; его центр — точка попадания
  readonly hitHeight: number
  // высота полёта над землёй, 0 у наземных
  readonly flightHeight: number
  // при падении HP ниже половины выпускает этих врагов (один раз)
  readonly spawnOnHalfHp?: { readonly type: EnemyType; readonly count: number }
}

export const ENEMIES = {
  grunt: { armor: 'infantry', hp: 45, speed: 1.6, reward: 10, leak: 1, hitHeight: 0.5, flightHeight: 0 },
  grenadier: { armor: 'infantry', hp: 120, speed: 1.1, reward: 18, leak: 2, hitHeight: 0.5, flightHeight: 0 },
  technical: { armor: 'light', hp: 130, speed: 2.6, reward: 16, leak: 2, hitHeight: 0.5, flightHeight: 0 },
  tank: { armor: 'tank', hp: 600, speed: 0.9, reward: 40, leak: 4, hitHeight: 0.6, flightHeight: 0 },
  drone: { armor: 'air', hp: 90, speed: 2.2, reward: 14, leak: 2, hitHeight: 0.3, flightHeight: 1.5 },
  boss: {
    armor: 'tank',
    hp: 3000,
    speed: 0.6,
    reward: 300,
    leak: 20,
    hitHeight: 1,
    flightHeight: 0,
    spawnOnHalfHp: { type: 'grunt', count: 4 },
  },
} as const satisfies Record<EnemyType, EnemyConfig>
