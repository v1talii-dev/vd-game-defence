import { TICK_RATE } from '@/shared/config'
import { WAVES, type WaveConfig } from '../config/waves'

export interface SpawnEntry {
  // тик от начала волны
  tick: number
  enemy: string
}

export const WAVE_COUNT = WAVES.length

// расписание спавна волны (номер с 1), отсортировано по тику, при равенстве — по порядку групп;
// waves — волны уровня (по умолчанию общие WAVES)
export function waveSchedule(wave: number, waves: readonly WaveConfig[] = WAVES): SpawnEntry[] {
  const cfg = waves[wave - 1]
  if (!cfg) return []
  const out: SpawnEntry[] = []
  for (const g of cfg.groups) {
    for (let i = 0; i < g.count; i++) {
      out.push({ tick: Math.round((g.delay + i * g.interval) * TICK_RATE), enemy: g.enemy })
    }
  }
  // sort стабилен, поэтому группы с одинаковым тиком сохраняют порядок конфига
  return out.sort((a, b) => a.tick - b.tick)
}
