import type { TowerType } from '@/entities/tower/@x/level'
import { WAVES, type WaveConfig } from '@/entities/wave/@x/level'

export interface LevelConfig {
  id: string
  // ключ i18n названия
  name: string
  // путь к карте Tiled относительно BASE_URL
  tmj: string
  waves: readonly WaveConfig[]
  startMoney: number
  hqHp: number
  // множитель HP врагов, по умолчанию 1
  hpScale?: number
  allowedTowers: readonly TowerType[]
  // башни, открываемые первым прохождением
  unlocks: readonly TowerType[]
  requires: { levelId?: string; stars?: number } | null
  // ключи i18n, 2–3 строки
  briefing: readonly string[]
  implemented: boolean
}

// порядок = порядок кампании
export const LEVELS: readonly LevelConfig[] = [
  {
    id: 'desert-base',
    name: 'level.desertBase.name',
    tmj: 'assets/maps/desert-base.tmj',
    waves: WAVES,
    startMoney: 600,
    hqHp: 20,
    allowedTowers: ['machineGun', 'rocket'],
    unlocks: [],
    requires: null,
    briefing: ['level.desertBase.briefing1', 'level.desertBase.briefing2'],
    implemented: true,
  },
  {
    // заглушка для проверки каркаса (замок, разблокировка), не играбельна; реальный уровень 2 — M13
    id: 'stub-2',
    name: 'level.stub2.name',
    tmj: 'assets/maps/desert-base.tmj',
    waves: WAVES,
    startMoney: 600,
    hqHp: 20,
    allowedTowers: ['machineGun', 'rocket'],
    unlocks: [],
    requires: { levelId: 'desert-base', stars: 1 },
    briefing: ['level.stub2.briefing1', 'level.stub2.briefing2'],
    implemented: false,
  },
]

export function getLevel(id: string): LevelConfig {
  const level = LEVELS.find((l) => l.id === id)
  if (!level) throw new Error(`Неизвестный уровень: ${id}`)
  return level
}
