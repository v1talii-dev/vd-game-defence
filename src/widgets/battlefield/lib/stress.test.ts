import { describe, expect, it } from 'vitest'
import { STRESS_ENEMIES, stressSetup } from './stress'

describe('stress', () => {
  it('ставит не больше 40 башен, начинает с денег и кончает спавном врагов', () => {
    const cells = Array.from({ length: 60 }, (_, i) => ({ x: i, y: 0 }))
    const cmds = stressSetup(cells)
    expect(cmds[0]!.type).toBe('grantMoney')
    expect(cmds.filter((c) => c.type === 'placeTower')).toHaveLength(40)
    expect(cmds.at(-1)).toMatchObject({ type: 'spawnEnemies', count: STRESS_ENEMIES })
    expect(stressSetup(cells.slice(0, 5))).toHaveLength(7)
  })
})
