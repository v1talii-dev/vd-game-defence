import { describe, expect, it } from 'vitest'
import {
  cellDiamond,
  cellToScreen,
  pickTile,
  radiusToScreen,
  screenToCell,
  screenToTile,
  tileCenterToScreen,
  tiledObjectToCell,
  worldSize,
} from '.'

describe('iso', () => {
  it('размеры мира 24x24', () => {
    expect(worldSize()).toEqual({ width: 1536, height: 768 })
  })

  it('клетка (0,0): верхний угол ромба касается верха мира', () => {
    const d = cellDiamond({ x: 0, y: 0 })
    expect(d[0]).toEqual({ x: 768, y: 0 })
    expect(tileCenterToScreen({ x: 0, y: 0 })).toEqual({ x: 768, y: 16 })
    expect(cellToScreen({ x: 0, y: 0 })).toEqual({ x: 768, y: 0 })
  })

  it('углы карты лежат на границах мира', () => {
    expect(cellDiamond({ x: 23, y: 23 })[2]).toEqual({ x: 768, y: 768 })
    expect(cellDiamond({ x: 23, y: 0 })[1]).toEqual({ x: 1536, y: 384 })
    expect(cellDiamond({ x: 0, y: 23 })[3]).toEqual({ x: 0, y: 384 })
  })

  it('обратимость для дробных координат', () => {
    for (const c of [
      { x: 3.25, y: 7.8 },
      { x: -1, y: 0 },
      { x: 23, y: 23.4 },
    ]) {
      const r = screenToCell(cellToScreen(c))
      expect(r.x).toBeCloseTo(c.x, 9)
      expect(r.y).toBeCloseTo(c.y, 9)
    }
  })

  it('screenToTile: точки внутри ромба относятся к своей клетке', () => {
    const t = { x: 5, y: 9 }
    const c = tileCenterToScreen(t)
    expect(screenToTile(c)).toEqual(t)
    expect(screenToTile({ x: c.x, y: c.y - 15 })).toEqual(t)
    expect(screenToTile({ x: c.x + 30, y: c.y })).toEqual(t)
    expect(screenToTile({ x: c.x, y: c.y + 17 })).toEqual({ x: 6, y: 10 })
  })

  it('объекты Tiled: координата = px / tileheight, центр клетки (i, j) = (i + 0.5, j + 0.5)', () => {
    expect(tiledObjectToCell({ x: 16, y: 16 })).toEqual({ x: 0.5, y: 0.5 })
    expect(tiledObjectToCell({ x: 3.5 * 32, y: 7.5 * 32 })).toEqual({ x: 3.5, y: 7.5 })
  })

  it('pickTile: вне карты null', () => {
    expect(pickTile(tileCenterToScreen({ x: 4, y: 5 }))).toEqual({ x: 4, y: 5 })
    expect(pickTile({ x: 0, y: 0 })).toBeNull()
    expect(pickTile(tileCenterToScreen({ x: 24, y: 3 }))).toBeNull()
  })
})

describe('radiusToScreen', () => {
  it('радиус 1 клетка: полуоси эллипса в sqrt2 раз больше половины тайла', () => {
    const { rx, ry } = radiusToScreen(1)
    expect(rx).toBeCloseTo(32 * Math.SQRT2)
    expect(ry).toBeCloseTo(16 * Math.SQRT2)
  })
})
