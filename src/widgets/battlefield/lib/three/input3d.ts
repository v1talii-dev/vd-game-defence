// Ввод 3D-боя: DOM-события канваса -> команды симуляции
import type { useBattleSession } from '@/entities/battle'
import { ENEMIES } from '@/entities/enemy'
import { TOWER_TYPES } from '@/entities/tower'
import { attachCameraControls3d } from '@/features/camera-controls'
import { buildSlotIndex, matches, type HotkeyAction } from '@/shared/config'
import {
  pickTarget,
  PICK_MIN_RADIUS,
  TOWER_PICK_HEIGHT,
  TOWER_PICK_RADIUS,
  TOWER_PICK_TOUCH_MARGIN,
  type createCameraRig,
  type PickTarget,
} from '@/shared/lib/three'
import { PAD_H } from './models'

type Session = ReturnType<typeof useBattleSession>
type Rig = ReturnType<typeof createCameraRig>
type Cell = { x: number; y: number }

export interface Input3d {
  /** башня/враг под курсором мыши (для подсветки) */
  hoverObj(): { kind: 'tower' | 'enemy'; id: number } | null
  /** клетка под курсором мыши (на таче всегда null) */
  hover(): Cell | null
  /** выбранный кликом враг (локальное состояние рендера, в симуляцию не уходит) */
  selectedEnemyId(): number | null
  tick(dtSec: number): void
  destroy(): void
}

export function attachInput3d(
  el: HTMLElement,
  rig: Rig,
  session: Session,
  buildable: Set<string>,
): Input3d {
  const controls = attachCameraControls3d(el, { rig })
  let hover: Cell | null = null
  let enemyId: number | null = null
  let hoverObj: { kind: 'tower' | 'enemy'; id: number } | null = null
  let downButton = 0

  const local = (e: PointerEvent) => {
    const r = el.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const cancel = () => {
    session.setBuildType(null)
    session.select(null)
    session.pendingCell = null
    enemyId = null
  }

  // руины выбираются кликом, но hover не ловят (withRuins=false)
  const towerTargets = (withRuins = true): PickTarget[] =>
    session
      .battle!.state.towers.filter((t) => withRuins || t.phase !== 'ruins')
      .map((t) => ({
        id: t.id,
        x: t.x,
        y: t.y,
        z: PAD_H,
        radius: TOWER_PICK_RADIUS,
        height: TOWER_PICK_HEIGHT,
        touchMargin: TOWER_PICK_TOUCH_MARGIN,
      }))
  const enemyTargets = (): PickTarget[] =>
    session.battle!.state.enemies.map((en) => ({
      id: en.id,
      x: en.x,
      y: en.y,
      z: en.z,
      radius: PICK_MIN_RADIUS,
      height: ENEMIES[en.type].hitHeight,
    }))

  let lastP: { x: number; y: number } | null = null
  let frames = 0
  const onMove = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return
    lastP = local(e)
    refresh()
  }
  const refresh = () => {
    const p = lastP!
    hover = rig.pickCell(p.x, p.y)
    hoverObj = null
    // в режиме постройки подсветка объектов не нужна: ghost следует за клеткой
    if (session.battle && !session.buildType && !controls.isDragging()) {
      const ray = rig.rayAt(p.x, p.y)
      const tid = pickTarget(ray, towerTargets(false))
      if (tid !== null) hoverObj = { kind: 'tower', id: tid }
      else {
        const eid = pickTarget(ray, enemyTargets())
        if (eid !== null) hoverObj = { kind: 'enemy', id: eid }
      }
    }
    el.style.cursor = hoverObj ? 'pointer' : ''
  }
  const onLeave = () => {
    lastP = null
    hover = null
    hoverObj = null
    el.style.cursor = ''
  }

  const onDown = (e: PointerEvent) => (downButton = e.button)
  const onUp = (e: PointerEvent) => {
    const battle = session.battle
    if (controls.isDragging() || !battle) return
    if (e.pointerType === 'mouse' && downButton === 2) return cancel()
    const p = local(e)
    const touch = e.pointerType === 'touch'
    const s = battle.state
    const cell = rig.pickCell(p.x, p.y)
    const ray = rig.rayAt(p.x, p.y)
    // в режиме постройки башня определяется клеткой (иначе соседняя башня съедала бы клик)
    const towerId = session.buildType
      ? (s.towers.find((t) => cell && t.cell.x === cell.x && t.cell.y === cell.y)?.id ??
        (touch ? pickTarget(ray, towerTargets(), true) : null))
      : pickTarget(ray, towerTargets(), touch)

    if (session.buildType && cell && towerId === null) {
      const occupied = s.towers.some((t) => t.cell.x === cell.x && t.cell.y === cell.y)
      if (touch && buildable.has(`${cell.x},${cell.y}`) && !occupied) {
        session.pendingCell = { x: cell.x, y: cell.y } // подтвердит кнопка «Построить»
      } else {
        // недопустимую клетку отвергнет симуляция, UI покажет причину
        session.dispatch({ type: 'placeTower', towerType: session.buildType, cell })
      }
      return
    }
    if (towerId !== null) {
      session.pendingCell = null
      enemyId = null
      session.select(towerId)
      return
    }
    if (!session.buildType) {
      const hit = pickTarget(ray, enemyTargets(), touch)
      if (hit !== null) {
        session.select(null)
        enemyId = hit
        return
      }
    }
    cancel()
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    const id = session.selectedTowerId
    const is = (a: HotkeyAction) => matches(a, e.code)
    let handled = true
    const slot = buildSlotIndex(e.code)
    if (slot !== null && TOWER_TYPES[slot]) {
      session.setBuildType(TOWER_TYPES[slot]!)
      session.pendingCell = null
    } else if (is('upgrade') && id !== null) {
      const t = session.battle?.state.towers.find((t) => t.id === id)
      const cancelIt = t?.phase === 'upgrading' || t?.upgradeOrder != null
      session.dispatch({ type: cancelIt ? 'cancelUpgrade' : 'upgradeTower', towerId: id })
    } else if (is('sell') && id !== null) session.dispatch({ type: 'sellTower', towerId: id })
    else if (is('prevTower') || is('nextTower')) {
      // только выбор: камера не двигается
      const towers = session.battle?.state.towers ?? []
      if (towers.length) {
        const i = towers.findIndex((t) => t.id === id)
        const step = is('nextTower') ? 1 : -1
        const next =
          i < 0 ? (step > 0 ? 0 : towers.length - 1) : (i + step + towers.length) % towers.length
        session.pendingCell = null
        session.select(towers[next]!.id)
      }
    } else if (is('cancel')) cancel()
    else if (is('nextWave')) session.dispatch({ type: 'startWave' })
    else if (is('pause')) session.paused = !session.paused
    else if (is('speed')) session.speed = session.speed === 1 ? 2 : 1
    else if (is('step') && session.paused) session.step(1)
    else handled = false
    if (handled) {
      e.preventDefault()
      // Space на сфокусированной кнопке не должен нажимать её второй раз
      if (is('nextWave')) (document.activeElement as HTMLElement | null)?.blur?.()
    }
  }
  const noMenu = (e: Event) => e.preventDefault()

  el.addEventListener('pointermove', onMove)
  el.addEventListener('pointerleave', onLeave)
  el.addEventListener('pointerdown', onDown)
  el.addEventListener('pointerup', onUp)
  el.addEventListener('contextmenu', noMenu)
  window.addEventListener('keydown', onKey)

  return {
    hover: () => hover,
    hoverObj: () => hoverObj,
    selectedEnemyId: () => enemyId,
    tick: (dt) => {
      controls.tick(dt)
      // враги движутся под неподвижным курсором — переопрашиваем наведение раз в 3 кадра
      if (lastP && session.battle && ++frames % 3 === 0 && !controls.isDragging()) refresh()
    },
    destroy() {
      controls.destroy()
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('contextmenu', noMenu)
      el.style.cursor = ''
      window.removeEventListener('keydown', onKey)
    },
  }
}
