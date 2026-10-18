import { describe, expect, it } from 'vitest'
import { TICK_RATE } from '@/shared/config'
import { ENEMIES } from '../config/enemies'
import { advanceEnemy, createEnemy, createPathGeometry, pointAt } from './enemy'

// Г-образный путь длиной 4 + 3 = 7 клеток
const geom = createPathGeometry([
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 4, y: 3 },
])

describe('путь', () => {
  it('длина и точка на расстоянии', () => {
    expect(geom.length).toBe(7)
    expect(pointAt(geom, 0)).toEqual({ x: 0, y: 0 })
    expect(pointAt(geom, 2)).toEqual({ x: 2, y: 0 })
    expect(pointAt(geom, 5.5)).toEqual({ x: 4, y: 1.5 })
    expect(pointAt(geom, 100)).toEqual({ x: 4, y: 3 })
    expect(pointAt(geom, -1)).toEqual({ x: 0, y: 0 })
  })
})

describe('движение врага', () => {
  it('за секунду (TICK_RATE тиков) проходит speed клеток', () => {
    const e = createEnemy(1, 'grunt', geom)
    expect(e).toMatchObject({ hp: ENEMIES.grunt.hp, maxHp: ENEMIES.grunt.hp, air: false })
    for (let i = 0; i < TICK_RATE; i++) advanceEnemy(e, geom)
    expect(e.distance).toBeCloseTo(ENEMIES.grunt.speed)
    expect(e.x).toBeCloseTo(ENEMIES.grunt.speed)
    expect(e.y).toBe(0)
  })

  it('дрон — воздушная цель', () => {
    expect(createEnemy(1, 'drone', geom).air).toBe(true)
  })

  it('сообщает о дохождении до конца пути', () => {
    const e = createEnemy(1, 'technical', geom, 6.99)
    expect(advanceEnemy(e, geom)).toBe(true)
    expect(e).toMatchObject({ x: 4, y: 3 })
  })
})
