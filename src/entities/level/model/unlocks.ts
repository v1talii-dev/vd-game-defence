import { TOWERS, type TowerType } from '@/entities/tower/@x/level'
import { LEVELS, type LevelConfig } from '../config/levels'

// прогресс уровней из сохранения: только нужное для разблокировок
export type LevelStars = Readonly<Record<string, { stars: number } | undefined>>

export function isLevelUnlocked(level: LevelConfig, levels: LevelStars): boolean {
  const req = level.requires
  if (!req) return true
  return (levels[req.levelId ?? '']?.stars ?? 0) >= (req.stars ?? 1)
}

// башня закрыта, пока не пройден (хотя бы на 1 звезду) уровень, где она в unlocks
export function unlockedTowers(levels: LevelStars): TowerType[] {
  const locked = new Set<string>(
    LEVELS.filter((l) => (levels[l.id]?.stars ?? 0) < 1).flatMap((l) => l.unlocks),
  )
  return (Object.keys(TOWERS) as TowerType[]).filter((t) => !locked.has(t))
}
