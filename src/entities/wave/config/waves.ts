export interface WaveGroup {
  // ключ EnemyType (тип хранит entities/enemy, проверяется в entities/battle)
  readonly enemy: string
  readonly count: number
  // секунд между врагами группы
  readonly interval: number
  // секунд от начала волны до первого врага группы
  readonly delay: number
}

export interface WaveConfig {
  readonly groups: readonly WaveGroup[]
}

export const WAVES = [
  { groups: [{ enemy: 'grunt', count: 8, interval: 1.2, delay: 0 }] },
  {
    groups: [
      { enemy: 'grunt', count: 12, interval: 1, delay: 0 },
      { enemy: 'grenadier', count: 2, interval: 2, delay: 6 },
    ],
  },
  {
    groups: [
      { enemy: 'grunt', count: 10, interval: 0.9, delay: 0 },
      { enemy: 'technical', count: 6, interval: 1.6, delay: 8 },
    ],
  },
  {
    groups: [
      { enemy: 'grenadier', count: 8, interval: 1.2, delay: 0 },
      { enemy: 'grunt', count: 10, interval: 0.8, delay: 3 },
    ],
  },
  {
    groups: [
      { enemy: 'grunt', count: 10, interval: 0.8, delay: 0 },
      { enemy: 'drone', count: 6, interval: 1.5, delay: 5 },
    ],
  },
  {
    groups: [
      { enemy: 'grunt', count: 8, interval: 0.8, delay: 0 },
      { enemy: 'tank', count: 3, interval: 3, delay: 4 },
      { enemy: 'technical', count: 4, interval: 1.5, delay: 10 },
    ],
  },
  {
    groups: [
      { enemy: 'technical', count: 12, interval: 1, delay: 0 },
      { enemy: 'grenadier', count: 6, interval: 1.5, delay: 4 },
    ],
  },
  {
    groups: [
      { enemy: 'drone', count: 10, interval: 1, delay: 0 },
      { enemy: 'tank', count: 3, interval: 4, delay: 6 },
    ],
  },
  {
    groups: [
      { enemy: 'grunt', count: 30, interval: 0.4, delay: 0 },
      { enemy: 'grenadier', count: 8, interval: 1.2, delay: 6 },
    ],
  },
  {
    groups: [
      { enemy: 'tank', count: 4, interval: 3, delay: 0 },
      { enemy: 'technical', count: 8, interval: 1, delay: 4 },
      { enemy: 'drone', count: 8, interval: 1, delay: 10 },
    ],
  },
  {
    groups: [
      { enemy: 'grunt', count: 15, interval: 0.6, delay: 0 },
      { enemy: 'tank', count: 6, interval: 2.5, delay: 3 },
      { enemy: 'drone', count: 18, interval: 0.6, delay: 8 },
    ],
  },
  {
    groups: [
      { enemy: 'boss', count: 1, interval: 0, delay: 0 },
      { enemy: 'grunt', count: 10, interval: 0.7, delay: 2 },
      { enemy: 'drone', count: 6, interval: 1, delay: 8 },
      { enemy: 'tank', count: 3, interval: 3, delay: 12 },
    ],
  },
] as const satisfies readonly WaveConfig[]
