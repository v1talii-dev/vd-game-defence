import { readFileSync } from 'node:fs'
import { getLevel, parseTiledLevel, type LevelData } from '@/entities/level'

// карта лежит в public/ и в браузере грузится по fetch, в тестах — с диска
export function rawLevelMap(levelId: string): { layers: { type: string }[] } {
  return JSON.parse(
    readFileSync(new URL(`../../public/${getLevel(levelId).tmj}`, import.meta.url), 'utf8'),
  )
}

export function loadLevelMap(levelId: string): LevelData {
  return parseTiledLevel(levelId, rawLevelMap(levelId))
}

export const rawDesertBase = () => rawLevelMap('desert-base')
export const loadDesertBase = () => loadLevelMap('desert-base')
