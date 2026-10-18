import { readFileSync } from 'node:fs'
import { parseTiledLevel, type LevelData } from '@/entities/level'

// карта лежит в public/ и в браузере грузится по fetch, в тестах — с диска
export function rawDesertBase(): { layers: { type: string }[] } {
  return JSON.parse(
    readFileSync(new URL('../../public/assets/maps/desert-base.tmj', import.meta.url), 'utf8'),
  )
}

export function loadDesertBase(): LevelData {
  return parseTiledLevel('desert-base', rawDesertBase())
}
