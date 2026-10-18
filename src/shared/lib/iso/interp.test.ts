import { describe, expect, it } from 'vitest'
import { interpolated, trackPosition } from './interp'

describe('interp', () => {
  it('первая запись без сдвига, новый тик сдвигает предыдущую позицию', () => {
    const r = trackPosition(undefined, 1, 1, 10)
    expect(interpolated(r, 0.5)).toEqual({ x: 1, y: 1 })
    trackPosition(r, 3, 5, 11)
    expect(interpolated(r, 0.5)).toEqual({ x: 2, y: 3 })
    trackPosition(r, 9, 9, 11) // тот же тик: без изменений
    expect(interpolated(r, 1)).toEqual({ x: 3, y: 5 })
  })

  it('alpha ограничен [0, 1]', () => {
    const r = trackPosition(trackPosition(undefined, 0, 0, 1), 10, 0, 2)
    expect(interpolated(r, 2).x).toBe(10)
    expect(interpolated(r, -1).x).toBe(0)
  })
})
