/** Минимум, который нужен управлению от камеры (структурно совместим с createCameraRig из shared/lib/three) */
export interface CameraRigLike {
  panGround(right: number, forward: number): void
  panByPixels(px: number, py: number, dx: number, dy: number): void
  zoomAt(factor: number, px: number, py: number): void
  rotate(dir: 1 | -1): void
  /** Продвинуть сглаживание поворота */
  step(dtSec: number): boolean
  state: { zoom: number }
}

export interface CameraControls3dOptions {
  rig: CameraRigLike
  /** false — клавиши игнорируются (например, S занята продажей башни) */
  keysEnabled?: () => boolean
  /** Куда вешать keydown/keyup; по умолчанию window */
  keyTarget?: EventTarget
}

export interface CameraControls3d {
  /** Вызывать каждый кадр: клавишный пан и плавный поворот */
  tick(dtSec: number): void
  /** true после перетаскивания/pinch — до следующего нажатия; клик после этого не выбирает клетку */
  isDragging(): boolean
  destroy(): void
}

const DRAG_THRESHOLD = 8 // px
const KEY_SPEED = 12 // клеток в секунду при zoom 1
const WHEEL_SENSITIVITY = 0.0015

/** Ввод камеры 3D на DOM-событиях элемента: колесо, drag-пан, pinch, WASD/стрелки, Q/E */
export function attachCameraControls3d(
  el: HTMLElement,
  opts: CameraControls3dOptions,
): CameraControls3d {
  const { rig } = opts
  const keyTarget: EventTarget = opts.keyTarget ?? window
  const pointers = new Map<number, { x: number; y: number }>()
  const held = new Set<string>()
  let dragged = false
  let downX = 0
  let downY = 0
  let pinchDist = 0

  const local = (e: { clientX: number; clientY: number }) => {
    const r = el.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const pinchState = () => {
    const [a, b] = [...pointers.values()] as [{ x: number; y: number }, { x: number; y: number }]
    return { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }
  }

  const onDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if (pointers.size === 0) dragged = false
    pointers.set(e.pointerId, local(e))
    el.setPointerCapture?.(e.pointerId)
    const p = pointers.get(e.pointerId)!
    if (pointers.size === 1) {
      downX = p.x
      downY = p.y
    } else if (pointers.size === 2) {
      dragged = true
      pinchDist = pinchState().d
    }
  }
  const onMove = (e: PointerEvent) => {
    const prev = pointers.get(e.pointerId)
    if (!prev) return
    const cur = local(e)
    pointers.set(e.pointerId, cur)
    if (pointers.size >= 2) {
      const { d, mx, my } = pinchState()
      if (pinchDist > 0 && d > 0) rig.zoomAt(d / pinchDist, mx, my)
      pinchDist = d
      return
    }
    if (!dragged && Math.hypot(cur.x - downX, cur.y - downY) < DRAG_THRESHOLD) return
    dragged = true
    rig.panByPixels(prev.x, prev.y, cur.x - prev.x, cur.y - prev.y)
  }
  const onUp = (e: PointerEvent) => {
    pointers.delete(e.pointerId)
    pinchDist = 0
    if (pointers.size === 1) {
      // после pinch оставшийся палец не должен дёргать карту
      const p = [...pointers.values()][0]!
      downX = p.x
      downY = p.y
    }
  }
  const onWheel = (e: WheelEvent) => {
    e.preventDefault()
    const p = local(e)
    rig.zoomAt(Math.exp(-e.deltaY * WHEEL_SENSITIVITY), p.x, p.y)
  }

  const enabled = () => opts.keysEnabled?.() ?? true
  const onKeyDown = (ev: Event) => {
    const e = ev as KeyboardEvent
    if (!enabled() || e.ctrlKey || e.metaKey || e.altKey) return
    const k = e.code
    if (!e.repeat && (k === 'KeyQ' || k === 'KeyE')) rig.rotate(k === 'KeyQ' ? -1 : 1)
    else held.add(k)
  }
  const onKeyUp = (ev: Event) => held.delete((ev as KeyboardEvent).code)
  const onBlur = () => held.clear()

  el.addEventListener('pointerdown', onDown as EventListener)
  el.addEventListener('pointermove', onMove as EventListener)
  el.addEventListener('pointerup', onUp as EventListener)
  el.addEventListener('pointercancel', onUp as EventListener)
  el.addEventListener('wheel', onWheel as EventListener, { passive: false })
  keyTarget.addEventListener('keydown', onKeyDown)
  keyTarget.addEventListener('keyup', onKeyUp)
  keyTarget.addEventListener('blur', onBlur)

  const any = (...codes: string[]) => codes.some((c) => held.has(c))
  return {
    tick(dtSec) {
      if (!enabled()) held.clear()
      const right = (any('KeyD', 'ArrowRight') ? 1 : 0) - (any('KeyA', 'ArrowLeft') ? 1 : 0)
      const fwd = (any('KeyW', 'ArrowUp') ? 1 : 0) - (any('KeyS', 'ArrowDown') ? 1 : 0)
      if (right || fwd) {
        const k = (KEY_SPEED * dtSec) / rig.state.zoom
        rig.panGround(right * k, fwd * k)
      }
      rig.step(dtSec)
    },
    isDragging: () => dragged,
    destroy() {
      el.removeEventListener('pointerdown', onDown as EventListener)
      el.removeEventListener('pointermove', onMove as EventListener)
      el.removeEventListener('pointerup', onUp as EventListener)
      el.removeEventListener('pointercancel', onUp as EventListener)
      el.removeEventListener('wheel', onWheel as EventListener)
      keyTarget.removeEventListener('keydown', onKeyDown)
      keyTarget.removeEventListener('keyup', onKeyUp)
      keyTarget.removeEventListener('blur', onBlur)
      pointers.clear()
      held.clear()
    },
  }
}
