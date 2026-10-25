import { describe, expect, it, vi } from 'vitest'
import { attachCameraControls3d, type CameraRigLike } from './attachCameraControls3d'

type Fn = (e: unknown) => void
const fakeTarget = () => {
  const m = new Map<string, Set<Fn>>()
  return {
    addEventListener: (t: string, f: Fn) => (m.get(t) ?? m.set(t, new Set()).get(t)!).add(f),
    removeEventListener: (t: string, f: Fn) => m.get(t)?.delete(f),
    getBoundingClientRect: () => ({ left: 10, top: 20 }),
    setPointerCapture: () => {},
    style: {} as Record<string, string>,
    fire: (t: string, e: object) => m.get(t)?.forEach((f) => f(e)),
    count: () => [...m.values()].reduce((n, s) => n + s.size, 0),
  }
}
const setup = () => {
  const el = fakeTarget()
  const keys = fakeTarget()
  const rig = {
    panGround: vi.fn(),
    panByPixels: vi.fn(),
    zoomAt: vi.fn(),
    state: { zoom: 1 },
  } satisfies CameraRigLike
  const ctl = attachCameraControls3d(el as unknown as HTMLElement, {
    rig,
    keyTarget: keys as unknown as EventTarget,
  })
  return { el, keys, rig, ctl }
}
const ptr = (id: number, x: number, y: number) => ({
  pointerId: id,
  pointerType: 'touch',
  button: 0,
  clientX: x + 10,
  clientY: y + 20,
})

describe('attachCameraControls3d', () => {
  it('колесо зумит в точке курсора (локальные координаты)', () => {
    const { el, rig } = setup()
    const preventDefault = vi.fn()
    el.fire('wheel', { deltaY: -100, clientX: 110, clientY: 120, preventDefault })
    expect(preventDefault).toHaveBeenCalled()
    expect(rig.zoomAt).toHaveBeenCalledWith(expect.closeTo(Math.exp(0.15), 5), 100, 100)
  })

  it('малый сдвиг — клик, большой — пан и isDragging', () => {
    const { el, rig, ctl } = setup()
    el.fire('pointerdown', ptr(1, 50, 50))
    el.fire('pointermove', ptr(1, 53, 52))
    expect(rig.panByPixels).not.toHaveBeenCalled()
    expect(ctl.isDragging()).toBe(false)
    el.fire('pointermove', ptr(1, 70, 50))
    expect(rig.panByPixels).toHaveBeenCalledWith(53, 52, 17, -2)
    expect(ctl.isDragging()).toBe(true)
    el.fire('pointerup', ptr(1, 70, 50))
    el.fire('pointerdown', ptr(1, 5, 5))
    expect(ctl.isDragging()).toBe(false)
  })

  it('pinch зумит и не панорамирует, выбор клетки блокируется', () => {
    const { el, rig, ctl } = setup()
    el.fire('pointerdown', ptr(1, 100, 100))
    el.fire('pointerdown', ptr(2, 200, 100))
    el.fire('pointermove', ptr(2, 300, 100))
    expect(rig.zoomAt).toHaveBeenCalledWith(2, 200, 100)
    expect(rig.panByPixels).not.toHaveBeenCalled()
    expect(ctl.isDragging()).toBe(true)
  })

  it('pinch зумит к центру жеста, тап после pinch проходит', () => {
    const { el, rig, ctl } = setup()
    el.fire('pointerdown', ptr(1, 100, 100))
    el.fire('pointerdown', ptr(2, 100, 200))
    el.fire('pointermove', ptr(2, 100, 300))
    expect(rig.zoomAt).toHaveBeenCalledWith(2, 100, 200)
    el.fire('pointerup', ptr(2, 100, 300))
    el.fire('pointerup', ptr(1, 100, 100))
    el.fire('pointerdown', ptr(3, 50, 50))
    expect(ctl.isDragging()).toBe(false)
    el.fire('pointermove', ptr(3, 52, 51))
    expect(rig.panByPixels).not.toHaveBeenCalled()
  })

  it('pointercancel сбрасывает pinch, dragged и палец', () => {
    const { el, rig, ctl } = setup()
    el.fire('pointerdown', ptr(1, 100, 100))
    el.fire('pointerdown', ptr(2, 200, 100))
    el.fire('pointercancel', ptr(1, 100, 100))
    el.fire('pointercancel', ptr(2, 200, 100))
    expect(ctl.isDragging()).toBe(false)
    el.fire('pointermove', ptr(2, 400, 100))
    expect(rig.zoomAt).not.toHaveBeenCalled()
    expect(rig.panByPixels).not.toHaveBeenCalled()
  })

  it('touch-action: none и contextmenu погашен', () => {
    const { el } = setup()
    expect(el.style.touchAction).toBe('none')
    const preventDefault = vi.fn()
    el.fire('contextmenu', { preventDefault })
    expect(preventDefault).toHaveBeenCalled()
  })

  it('WASD, Q/E не поворачивают; WASD двигает в tick, keysEnabled=false глушит', () => {
    const { keys, rig, ctl } = setup()
    keys.fire('keydown', { code: 'KeyQ' })
    keys.fire('keydown', { code: 'KeyE' })
    expect(rig.panGround).not.toHaveBeenCalled()
    keys.fire('keydown', { code: 'KeyD' })
    keys.fire('keydown', { code: 'KeyW' })
    ctl.tick(0.5)
    expect(rig.panGround).toHaveBeenCalledWith(6, 6)
    keys.fire('keyup', { code: 'KeyD' })
    keys.fire('keyup', { code: 'KeyW' })
    rig.panGround.mockClear()
    ctl.tick(0.5)
    expect(rig.panGround).not.toHaveBeenCalled()
  })

  it('destroy снимает все обработчики', () => {
    const { el, keys, ctl } = setup()
    expect(el.count() + keys.count()).toBeGreaterThan(0)
    ctl.destroy()
    expect(el.count() + keys.count()).toBe(0)
  })
})
