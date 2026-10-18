import type Phaser from 'phaser'
import type { useBattleSession } from '@/entities/battle'
import { TOWER_TYPES, type TowerState } from '@/entities/tower'
import type { CameraControls } from '@/features/camera-controls'
import { createLogger } from '@/shared/lib/debug'
import { pickTile, screenToCell, type Point } from '@/shared/lib/iso'
import { tileKey } from './terrain'

const log = createLogger('input')
type Session = ReturnType<typeof useBattleSession>

/** Радиус тап-попадания по башне в клетках (тач-палец толще курсора) */
const TOUCH_TOWER_RADIUS = 1.1

/** Башня под точкой: на мыши — по клетке, на таче — ближайшая в пределах радиуса */
export function towerAt(
  towers: readonly TowerState[],
  world: Point,
  tile: Point | null,
  touch: boolean,
): TowerState | null {
  const byTile = tile && towers.find((t) => t.cell.x === tile.x && t.cell.y === tile.y)
  if (byTile) return byTile
  if (!touch) return null
  const c = screenToCell(world)
  let best: TowerState | null = null
  let bestD = TOUCH_TOWER_RADIUS
  for (const t of towers) {
    const d = Math.hypot(t.x - c.x, t.y - c.y)
    if (d <= bestD) {
      best = t
      bestD = d
    }
  }
  return best
}

export interface BattleInput {
  /** клетка под курсором мыши (на таче всегда null) */
  hover(): Point | null
  destroy(): void
}

export function attachBattleInput(
  scene: Phaser.Scene,
  session: Session,
  controls: CameraControls,
  buildable: Set<string>,
  toggleDebug: () => void,
): BattleInput {
  const cam = scene.cameras.main
  let hover: Point | null = null
  const occupied = () =>
    new Set(session.battle?.state.towers.map((t) => tileKey(t.cell.x, t.cell.y)))

  const cancel = () => {
    session.setBuildType(null)
    session.select(null)
    session.pendingCell = null
  }

  const onMove = (p: Phaser.Input.Pointer) => {
    hover = p.wasTouch ? null : pickTile(cam.getWorldPoint(p.x, p.y))
  }

  const onUp = (p: Phaser.Input.Pointer) => {
    if (controls.isDragging() || !session.battle) return
    if (p.button === 2) return cancel()
    const world = cam.getWorldPoint(p.x, p.y)
    const tile = pickTile(world)
    const touch = p.wasTouch
    const tower = towerAt(session.battle.state.towers, world, tile, touch)
    if (session.buildType && tile && !tower) {
      if (
        touch &&
        buildable.has(tileKey(tile.x, tile.y)) &&
        !occupied().has(tileKey(tile.x, tile.y))
      ) {
        session.pendingCell = { x: tile.x, y: tile.y } // подтвердит кнопка «Построить»
      } else {
        // недопустимую клетку отвергнет симуляция, UI покажет причину
        session.dispatch({ type: 'placeTower', towerType: session.buildType, cell: tile })
      }
      return
    }
    if (tower) {
      session.pendingCell = null
      session.select(tower.id)
      return
    }
    log.debug('клик мимо', tile)
    cancel()
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    const id = session.selectedTowerId
    let handled = true
    if (/^Digit[1-9]$/.test(e.code) && TOWER_TYPES[Number(e.code.slice(5)) - 1]) {
      session.setBuildType(TOWER_TYPES[Number(e.code.slice(5)) - 1]!)
      session.pendingCell = null
    } else if (e.code === 'KeyU' && id !== null)
      session.dispatch({ type: 'upgradeTower', towerId: id })
    else if (e.code === 'KeyS' && id !== null) session.dispatch({ type: 'sellTower', towerId: id })
    else if (e.code === 'Escape') cancel()
    else if (e.code === 'Space') session.dispatch({ type: 'startWave' })
    else if (e.code === 'KeyP') session.paused = !session.paused
    else if (e.code === 'KeyF') session.speed = session.speed === 1 ? 2 : 1
    else if (e.code === 'Period' && session.paused) session.step(1)
    else if (e.code === 'F3') toggleDebug()
    else handled = false
    if (handled) {
      e.preventDefault()
      // Space на сфокусированной кнопке не должен нажимать её второй раз
      if (e.code === 'Space') (document.activeElement as HTMLElement | null)?.blur?.()
    }
  }

  scene.input.mouse?.disableContextMenu()
  scene.input.on('pointermove', onMove)
  scene.input.on('pointerup', onUp)
  scene.input.on('gameout', () => (hover = null))
  scene.input.keyboard?.on('keydown', onKey)

  let destroyed = false
  const destroy = () => {
    if (destroyed) return
    destroyed = true
    scene.input.off('pointermove', onMove)
    scene.input.off('pointerup', onUp)
    scene.input.off('gameout')
    scene.input.keyboard?.off('keydown', onKey)
    scene.events.off('shutdown', destroy)
    scene.events.off('destroy', destroy)
  }
  scene.events.once('shutdown', destroy)
  scene.events.once('destroy', destroy)
  return { hover: () => hover, destroy }
}
