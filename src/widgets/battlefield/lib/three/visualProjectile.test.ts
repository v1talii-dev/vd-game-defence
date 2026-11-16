import { expect, it } from 'vitest'
import { projectilePosition, type ProjectileState } from '@/entities/projectile'
import { TOWER_MUZZLE } from './modelConfig'
import { visualMuzzle, visualProjectilePosition } from './visualProjectile'

it('rotates and scales the visual muzzle without moving the simulated launch or impact', () => {
  const from = visualMuzzle(TOWER_MUZZLE.machineGun, 2, 3, 0.1, Math.PI / 2, 1.2)
  expect(from.x).toBeCloseTo(2.72)
  expect(from.y).toBeCloseTo(3)
  expect(from.z).toBeCloseTo(1.036)
  for (const kind of ['bullet', 'rocket'] as const) {
    const p: ProjectileState = {
      id: 1,
      towerId: 2,
      hostile: false,
      attackerId: 0,
      targetId: 3,
      kind,
      x: 2,
      y: 3,
      z: 0.5,
      fromX: 2,
      fromY: 3,
      fromZ: 0.5,
      tx: 5,
      ty: 6,
      tz: 0.25,
      t: 0,
      dt: 0.1,
      arc: 0.4,
      speed: 9,
      damage: 7,
      damageType: kind,
    }
    const before = structuredClone(p)
    expect(visualProjectilePosition(p, 0, from)).toEqual(from)
    expect(visualProjectilePosition(p, 1, from)).toEqual(projectilePosition(p, 1))
    expect(visualProjectilePosition(p, 0.5)).toEqual(projectilePosition(p, 0.5))
    expect(p).toEqual(before)
  }
})
