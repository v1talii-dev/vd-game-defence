import { describe, expect, it } from 'vitest'
import { TICK_RATE } from '@/shared/config'
import { WAVES } from '../config/waves'
import { WAVE_COUNT, waveSchedule } from './spawner'

describe('спавнер волн', () => {
  it('12 волн, босс в последней', () => {
    expect(WAVE_COUNT).toBe(12)
    expect(waveSchedule(12).some((s) => s.enemy === 'boss')).toBe(true)
    expect(waveSchedule(0)).toEqual([])
    expect(waveSchedule(13)).toEqual([])
  })

  it('состав и тайминги совпадают с конфигом', () => {
    WAVES.forEach((wave, i) => {
      const schedule = waveSchedule(i + 1)
      expect(schedule.length).toBe(wave.groups.reduce((n, g) => n + g.count, 0))
      for (const g of wave.groups) {
        const ticks = schedule.filter((s) => s.enemy === g.enemy).map((s) => s.tick)
        for (let k = 0; k < g.count; k++) {
          expect(ticks).toContain(Math.round((g.delay + k * g.interval) * TICK_RATE))
        }
      }
      expect(schedule.map((s) => s.tick)).toEqual(
        [...schedule.map((s) => s.tick)].sort((a, b) => a - b),
      )
    })
  })

  it('волна 1: 8 боевиков каждые 1.2 с', () => {
    expect(waveSchedule(1)).toEqual(
      Array.from({ length: 8 }, (_, i) => ({
        tick: Math.round(i * 1.2 * TICK_RATE),
        enemy: 'grunt',
      })),
    )
  })
})
