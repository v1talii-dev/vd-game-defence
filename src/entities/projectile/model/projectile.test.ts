import { describe, expect, it } from 'vitest'
import { TICK_RATE } from '@/shared/config'
import {
  advanceProjectile,
  createProjectile,
  projectilePosition,
  type ProjectileKind,
} from './projectile'

const launch = (kind: ProjectileKind, arcFactor = 0, speed = TICK_RATE) =>
  createProjectile({
    id: 1,
    towerId: 1,
    targetId: 2,
    kind,
    from: { x: 0, y: 0, z: 0.5 },
    aim: { x: 3, y: 4, z: 0.25 },
    speed,
    arcFactor,
    minArc: 0,
    damage: 1,
    damageType: kind,
  })

describe('снаряд', () => {
  it('t=0 — дуло, t=1 — цель', () => {
    const p = launch('rocket', 0.3)
    expect(projectilePosition(p, 0)).toEqual({ x: 0, y: 0, z: 0.5 })
    expect(projectilePosition(p, 1)).toEqual({ x: 3, y: 4, z: 0.25 })
  })

  it('bullet летит по прямой и долетает за расстояние / скорость', () => {
    const p = launch('bullet')
    let ticks = 1
    while (!advanceProjectile(p)) ticks++
    // дистанция ≈ 5.0 клеток при 1 клетке за тик
    expect(ticks).toBe(6)
    expect(p).toMatchObject({ x: 3, y: 4, z: 0.25 })
    expect(projectilePosition(p, 0.5).z).toBeCloseTo(0.375)
  })

  it('rocket: вершина дуги на 0.3·дистанции над прямой, z >= 0', () => {
    const p = launch('rocket', 0.3)
    const d = Math.sqrt(9 + 16 + 0.0625)
    expect(p.arc).toBeCloseTo(0.3 * d)
    expect(projectilePosition(p, 0.5).z).toBeCloseTo(0.4375 + p.arc)
    for (let i = 0; i <= 100; i++)
      expect(projectilePosition(p, i / 100).z).toBeGreaterThanOrEqual(0)
  })

  it('rocket разгоняется: на t=0.5 пройдена четверть пути', () => {
    const p = launch('rocket', 0.3)
    expect(projectilePosition(p, 0.5)).toMatchObject({ x: 0.75, y: 1 })
  })

  it('z не уходит ниже 0 при нырке вниз', () => {
    const p = launch('bullet')
    p.fromZ = 0
    p.tz = -1
    expect(projectilePosition(p, 1).z).toBe(0)
  })

  it('совпадающие точки — попадание за один тик', () => {
    const p = launch('bullet')
    p.t = 0
    const q = createProjectile({
      id: 2,
      towerId: 1,
      targetId: 2,
      kind: 'bullet',
      from: { x: 1, y: 1, z: 1 },
      aim: { x: 1, y: 1, z: 1 },
      speed: 5,
      arcFactor: 0,
      minArc: 0,
      damage: 1,
      damageType: 'bullet',
    })
    expect(advanceProjectile(q)).toBe(true)
  })
})
