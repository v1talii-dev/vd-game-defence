import { describe, expect, it } from 'vitest'
import { stressSetup, stressWantsWave } from './stress'

describe('stress', () => {
  it('ставит не больше 40 башен и начинает с денег', () => {
    const cells = Array.from({ length: 60 }, (_, i) => ({ x: i, y: 0 }))
    const cmds = stressSetup(cells)
    expect(cmds[0]!.type).toBe('grantMoney')
    expect(cmds.filter((c) => c.type === 'placeTower')).toHaveLength(40)
    expect(stressSetup(cells.slice(0, 5))).toHaveLength(6)
  })
  it('новую волну просит только в паузе и пока врагов мало', () => {
    expect(stressWantsWave(10, 'prep', 3, 12)).toBe(true)
    expect(stressWantsWave(10, 'active', 3, 12)).toBe(false)
    expect(stressWantsWave(150, 'prep', 3, 12)).toBe(false)
    expect(stressWantsWave(0, 'prep', 12, 12)).toBe(false)
  })
})
