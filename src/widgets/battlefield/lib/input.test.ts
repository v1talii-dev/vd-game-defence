import { describe, expect, it } from 'vitest'
import type { TowerState } from '@/entities/tower'
import { tileCenterToScreen } from '@/shared/lib/iso'
import { towerAt } from './input'

const tower = (x: number, y: number) =>
  ({ id: 1, cell: { x, y }, x: x + 0.5, y: y + 0.5 }) as unknown as TowerState

describe('towerAt', () => {
  it('мышь: только точная клетка', () => {
    const w = tileCenterToScreen({ x: 5, y: 5 })
    expect(towerAt([tower(5, 5)], w, { x: 5, y: 5 }, false)?.id).toBe(1)
    expect(towerAt([tower(5, 5)], w, { x: 6, y: 5 }, false)).toBeNull()
  })

  it('тач: ближайшая башня в пределах радиуса', () => {
    const w = tileCenterToScreen({ x: 6, y: 5 })
    expect(towerAt([tower(5, 5)], w, { x: 6, y: 5 }, true)?.id).toBe(1)
    expect(towerAt([tower(2, 2)], w, { x: 6, y: 5 }, true)).toBeNull()
  })
})
