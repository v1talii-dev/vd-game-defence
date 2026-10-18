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
  // при падении HP ниже половины выпускает этих врагов (один раз)
  readonly spawnOnHalfHp?: { readonly type: EnemyType; readonly count: number }
}

export const ENEMIES = {
  grunt: { armor: 'infantry', hp: 45, speed: 1.6, reward: 10, leak: 1 },
  grenadier: { armor: 'infantry', hp: 120, speed: 1.1, reward: 18, leak: 2 },
  technical: { armor: 'light', hp: 130, speed: 2.6, reward: 16, leak: 2 },
  tank: { armor: 'tank', hp: 600, speed: 0.9, reward: 40, leak: 4 },
  drone: { armor: 'air', hp: 90, speed: 2.2, reward: 14, leak: 2 },
  boss: {
    armor: 'tank',
    hp: 3000,
    speed: 0.6,
    reward: 300,
    leak: 20,
    spawnOnHalfHp: { type: 'grunt', count: 4 },
  },
} as const satisfies Record<EnemyType, EnemyConfig>
