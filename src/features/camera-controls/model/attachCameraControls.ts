import type Phaser from 'phaser'
import { clamp, clampView, distance, pinchZoom, zoomAt, type Bounds, type View } from '../lib/math'

export interface CameraControlsOptions {
  worldBounds: Bounds
  minZoom: number
  maxZoom: number
}

export interface CameraControls {
  destroy(): void
  /** true после перетаскивания/pinch — до следующего нажатия; клик после этого не выбирает клетку */
  isDragging(): boolean
}

const DRAG_THRESHOLD = 8 // px экрана
const KEY_SPEED = 700 // px экрана в секунду
const EDGE_ZONE = 24
const WHEEL_SENSITIVITY = 0.0015

export function attachCameraControls(
  scene: Phaser.Scene,
  opts: CameraControlsOptions,
): CameraControls {
  const cam = scene.cameras.main
  const input = scene.input
  let view: View = { cx: cam.midPoint.x, cy: cam.midPoint.y, zoom: cam.zoom }
  let dragged = false
  let downX = 0
  let downY = 0
  let dragging = false // палец/кнопка зажаты и камера может тащиться
  let pinchDist = 0
  let pinchMidX = 0
  let pinchMidY = 0
  let mouseInside = false

  input.addPointer(1) // второй палец для pinch

  const apply = (v: View) => {
    view = clampView(v, opts.worldBounds, cam.width, cam.height)
    cam.setZoom(view.zoom)
    cam.centerOn(view.cx, view.cy)
  }
  apply(view)

  const keys = scene.input.keyboard?.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT', false) as
    Record<string, Phaser.Input.Keyboard.Key> | undefined
  const down = (...names: string[]) => names.some((n) => keys?.[n]?.isDown)

  const touching = () => input.pointer1.isDown && input.pointer2.isDown

  const onDown = (p: Phaser.Input.Pointer) => {
    if (!touching() && !dragging) dragged = false // новый жест начинается с чистого флага
    if (touching()) {
      dragged = true
      const { pointer1: a, pointer2: b } = input
      pinchDist = distance(a.x, a.y, b.x, b.y)
      pinchMidX = (a.x + b.x) / 2
      pinchMidY = (a.y + b.y) / 2
    } else if (p.leftButtonDown() || p.wasTouch) {
      dragging = true
      downX = p.x
      downY = p.y
    }
  }

  const onMove = (p: Phaser.Input.Pointer) => {
    if (!p.wasTouch) mouseInside = true
    if (touching()) {
      const { pointer1: a, pointer2: b } = input
      const d = distance(a.x, a.y, b.x, b.y)
      const mx = (a.x + b.x) / 2
      const my = (a.y + b.y) / 2
      const z = pinchZoom(view.zoom, pinchDist, d, opts.minZoom, opts.maxZoom)
      const zoomed = zoomAt(view, z, mx, my, cam.width, cam.height)
      // одновременный сдвиг центра между пальцами
      apply({
        ...zoomed,
        cx: zoomed.cx - (mx - pinchMidX) / z,
        cy: zoomed.cy - (my - pinchMidY) / z,
      })
      pinchDist = d
      pinchMidX = mx
      pinchMidY = my
      return
    }
    if (!dragging || !p.isDown || p.id > 1) return
    if (!dragged && distance(downX, downY, p.x, p.y) < DRAG_THRESHOLD) return
    dragged = true
    apply({
      ...view,
      cx: view.cx - (p.x - p.prevPosition.x) / view.zoom,
      cy: view.cy - (p.y - p.prevPosition.y) / view.zoom,
    })
  }

  const onUp = () => {
    if (!input.pointer1.isDown) dragging = false
  }

  const onWheel = (p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
    const z = clamp(view.zoom * Math.exp(-dy * WHEEL_SENSITIVITY), opts.minZoom, opts.maxZoom)
    apply(zoomAt(view, z, p.x, p.y, cam.width, cam.height))
  }

  const onUpdate = (_t: number, dtMs: number) => {
    const step = (KEY_SPEED * dtMs) / 1000 / view.zoom
    let dx = (down('D', 'RIGHT') ? 1 : 0) - (down('A', 'LEFT') ? 1 : 0)
    let dy = (down('S', 'DOWN') ? 1 : 0) - (down('W', 'UP') ? 1 : 0)
    // край экрана — только для мыши, наведённой на canvas (не тач)
    const m = input.activePointer
    if (mouseInside && !m.wasTouch && !m.isDown) {
      if (m.x <= EDGE_ZONE) dx -= 1
      else if (m.x >= cam.width - EDGE_ZONE) dx += 1
      if (m.y <= EDGE_ZONE) dy -= 1
      else if (m.y >= cam.height - EDGE_ZONE) dy += 1
    }
    dx = clamp(dx, -1, 1)
    dy = clamp(dy, -1, 1)
    if (dx || dy) apply({ ...view, cx: view.cx + dx * step, cy: view.cy + dy * step })
  }

  const onOut = () => (mouseInside = false)
  const onOver = () => (mouseInside = true)

  input.on('pointerdown', onDown)
  input.on('pointermove', onMove)
  input.on('pointerup', onUp)
  input.on('pointerupoutside', onUp)
  input.on('wheel', onWheel)
  input.on('gameout', onOut)
  input.on('gameover', onOver)
  scene.events.on('update', onUpdate)

  let destroyed = false
  const destroy = () => {
    if (destroyed) return
    destroyed = true
    input.off('pointerdown', onDown)
    input.off('pointermove', onMove)
    input.off('pointerup', onUp)
    input.off('pointerupoutside', onUp)
    input.off('wheel', onWheel)
    input.off('gameout', onOut)
    input.off('gameover', onOver)
    scene.events.off('update', onUpdate)
    scene.events.off('shutdown', destroy)
    scene.events.off('destroy', destroy)
    for (const k of Object.values(keys ?? {})) scene.input.keyboard?.removeKey(k, true)
  }
  scene.events.once('shutdown', destroy)
  scene.events.once('destroy', destroy)

  return { destroy, isDragging: () => dragged }
}
