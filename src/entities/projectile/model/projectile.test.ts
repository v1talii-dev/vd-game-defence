import { describe, expect, it } from 'vitest'
import { TICK_RATE } from '@/shared/config'
import { advanceProjectile, type ProjectileState } from './projectile'

describe('снаряд', () => {
  it('летит к точке со своей скоростью и сообщает о попадании', () => {
    const p: ProjectileState = {
      id: 1,
      towerId: 1,
      targetId: 2,
      x: 0,
      y: 0,
      tx: 3,
      ty: 4,
      speed: TICK_RATE,
      damage: 1,
      damageType: 'bullet',
      splash: 0,
      homing: true,
    }
    let ticks = 0
    while (!advanceProjectile(p)) ticks++
    // 5 клеток при скорости 1 клетка за тик
    expect(ticks).toBe(4)
    expect(p).toMatchObject({ x: 3, y: 4 })
  })
})
