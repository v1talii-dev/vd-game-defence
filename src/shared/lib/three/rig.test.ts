import { describe, expect, it } from 'vitest'
import { cellToWorld, createCameraRig, worldToCell } from './rig'
import { pickTarget, TOWER_PICK_HEIGHT, TOWER_PICK_RADIUS, TOWER_PICK_TOUCH_MARGIN } from './pick'

const mk = () => {
  const rig = createCameraRig(16 / 9, 20, 10)
  rig.setViewport(1280, 720)
  return rig
}

describe('three rig', () => {
  it('клетка <-> мир', () => {
    const w = cellToWorld(3, 5, 1.5)
    expect(w.toArray()).toEqual([3, 1.5, 5])
    expect(worldToCell(w)).toEqual({ x: 3, y: 5, z: 1.5 })
  })
  it('камера смотрит на центр карты сверху', () => {
    const { camera } = createCameraRig(16 / 9, 20, 10)
    expect(camera.position.y).toBeGreaterThan(5)
    expect(camera.fov).toBe(30)
  })

  it('cellToScreen <-> screenToCell обратимы при разных yaw и зуме', () => {
    for (const yaw of [Math.PI / 4, (3 * Math.PI) / 4, -Math.PI / 4, 1.2])
      for (const zoom of [0.7, 1, 2.5, 6]) {
        const rig = mk()
        rig.setState({ yaw, zoom, x: 8, y: 6 })
        for (const c of [
          { x: 8, y: 6 },
          { x: 10.5, y: 4.5 },
          { x: 6.5, y: 7.5 },
        ]) {
          const s = rig.cellToScreen(c)
          const back = rig.screenToCell(s.x, s.y)!
          expect(back.x).toBeCloseTo(c.x, 4)
          expect(back.y).toBeCloseTo(c.y, 4)
        }
      }
  })

  it('центр карты — центр экрана; pickCell вне карты — null', () => {
    const rig = mk()
    const s = rig.cellToScreen({ x: 10, y: 5 })
    expect(s.x).toBeCloseTo(640, 3)
    expect(s.y).toBeCloseTo(360, 3)
    expect(rig.pickCell(640, 360)).toEqual({ x: 10, y: 5 })
    expect(rig.pickCell(0, 0)).toBeNull() // небо / вне карты
  })

  it('пан и зум ограничены краями карты и диапазоном', () => {
    const rig = mk()
    rig.setState({ x: -50, y: 999, zoom: 100 })
    expect(rig.state).toMatchObject({ x: 0, y: 10, zoom: 6 })
    rig.panGround(100, 0)
    expect(rig.state.x).toBeLessThanOrEqual(20)
    rig.setState({ zoom: 0.01 })
    expect(rig.state.zoom).toBe(0.6)
  })

  it('зум сохраняет клетку под курсором', () => {
    const rig = mk()
    const before = rig.screenToCell(700, 380)!
    rig.zoomAt(1.8, 700, 380)
    const after = rig.screenToCell(700, 380)!
    expect(after.x).toBeCloseTo(before.x, 3)
    expect(after.y).toBeCloseTo(before.y, 3)
  })

  it('panByPixels: клетка под пальцем едет за пальцем', () => {
    const rig = mk()
    const c = rig.screenToCell(500, 300)!
    rig.panByPixels(500, 300, 40, 25)
    const s = rig.cellToScreen(c)
    expect(s.x).toBeCloseTo(540, 1)
    expect(s.y).toBeCloseTo(325, 1)
  })

  it('panGround: вперёд двигает цель к верху экрана', () => {
    const rig = mk()
    const c = { x: rig.state.x, y: rig.state.y }
    rig.panGround(0, 2)
    const s = rig.cellToScreen(c)
    expect(s.y).toBeGreaterThan(360)
  })
})

describe('pickTarget', () => {
  it('клик по верху модели и рядом с основанием попадает, мимо — нет', () => {
    const rig = mk()
    const tower = { id: 7, x: 10.5, y: 5.5, radius: 0.3, height: 1 }
    const top = rig.cellToScreen({ x: 10.5, y: 5.5, z: 1 })
    expect(pickTarget(rig.rayAt(top.x, top.y), [tower])).toBe(7)
    const near = rig.cellToScreen({ x: 11.0, y: 5.5, z: 0 }) // за пределами радиуса модели, внутри запаса
    expect(pickTarget(rig.rayAt(near.x, near.y), [tower])).toBe(7)
    const far = rig.cellToScreen({ x: 14, y: 5.5, z: 0 })
    expect(pickTarget(rig.rayAt(far.x, far.y), [tower])).toBeNull()
  })

  it('тач даёт больший запас; побеждает ближайший к камере', () => {
    const rig = mk()
    const t = { id: 1, x: 10.5, y: 5.5, radius: 0.3, height: 1 }
    const p = rig.cellToScreen({ x: 11.4, y: 5.5, z: 0 })
    expect(pickTarget(rig.rayAt(p.x, p.y), [t], false)).toBeNull()
    expect(pickTarget(rig.rayAt(p.x, p.y), [t], true)).toBe(1)
    const s = rig.cellToScreen({ x: 10.5, y: 5.5, z: 0.5 })
    const ray = rig.rayAt(s.x, s.y)
    const a = { id: 1, x: 10.5, y: 5.5, radius: 0.5, height: 1 }
    // камера смотрит из +x,+z (yaw 45°): объект ближе к камере имеет больший x+y
    const b = { id: 2, x: 11, y: 6, radius: 0.5, height: 3 }
    expect(pickTarget(ray, [a, b])).toBe(2)
  })

  it('башня: радиус 0.8 (тач 1.0), враг: 0.55 (тач 0.95)', () => {
    const rig = mk()
    const at = (dx: number, touch: boolean, tower: boolean) => {
      const t = tower
        ? {
            id: 1,
            x: 10.5,
            y: 5.5,
            radius: TOWER_PICK_RADIUS,
            height: TOWER_PICK_HEIGHT,
            touchMargin: TOWER_PICK_TOUCH_MARGIN,
          }
        : { id: 1, x: 10.5, y: 5.5, radius: 0.1, height: 1 }
      const p = rig.cellToScreen({ x: 10.5 + dx * Math.SQRT1_2, y: 5.5 - dx * Math.SQRT1_2, z: 0 })
      return pickTarget(rig.rayAt(p.x, p.y), [t], touch)
    }
    expect(at(0.75, false, true)).toBe(1)
    expect(at(0.85, false, true)).toBeNull()
    expect(at(0.95, true, true)).toBe(1)
    expect(at(1.05, true, true)).toBeNull()
    expect(at(0.5, false, false)).toBe(1)
    expect(at(0.6, false, false)).toBeNull()
    expect(at(0.9, true, false)).toBe(1)
    expect(at(1.0, true, false)).toBeNull()
  })
})
