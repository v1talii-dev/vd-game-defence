import type Phaser from 'phaser'
import {
  TOWERS,
  createTowerView,
  towerStats,
  type TowerType,
  type TowerView,
} from '@/entities/tower'
import { cellDiamond, cellToScreen, radiusToScreen, tileCenterToScreen } from '@/shared/lib/iso'
import { elevationAtTile } from './terrain'

/** Ghost-превью постройки и радиус дальности (ghost, выбранная башня) */
export function createOverlay(scene: Phaser.Scene) {
  const g = scene.add.graphics().setDepth(-4e5)
  let ghost: TowerView | null = null
  let ghostType: TowerType | null = null

  function ring(x: number, y: number, r: number, color: number, fill: number) {
    const { rx, ry } = radiusToScreen(r)
    g.fillStyle(color, fill)
    g.fillEllipse(x, y, rx * 2, ry * 2)
    g.lineStyle(2, color, 0.9)
    g.strokeEllipse(x, y, rx * 2, ry * 2)
  }

  return {
    /** cell — целая клетка или null; valid — можно ли строить */
    draw(
      ghostCell: { x: number; y: number } | null,
      type: TowerType | null,
      valid: boolean,
      selected: { x: number; y: number; range: number; minRange: number } | null,
    ) {
      g.clear()
      if (selected) {
        const e = elevationAtTile(selected.x, selected.y)
        const c = cellToScreen(selected)
        ring(c.x, c.y - e, selected.range, 0xffffff, 0.08)
        if (selected.minRange > 0) ring(c.x, c.y - e, selected.minRange, 0xff6060, 0.12)
      }
      if (!ghostCell || !type) {
        ghost?.destroy()
        ghost = null
        ghostType = null
        return
      }
      const color = valid ? 0x66e070 : 0xe05050
      const e = elevationAtTile(ghostCell.x, ghostCell.y)
      const c = tileCenterToScreen(ghostCell)
      g.fillStyle(color, 0.5)
      g.fillPoints(
        cellDiamond(ghostCell).map((p) => ({ x: p.x, y: p.y - e })),
        true,
      )
      const st = towerStats(type, 1, 0)
      ring(c.x, c.y - e, st.range, color, 0.1)
      if (TOWERS[type].minRange > 0) ring(c.x, c.y - e, TOWERS[type].minRange, 0xff6060, 0.15)
      if (!ghost || ghostType !== type) {
        ghost?.destroy()
        ghost = createTowerView(scene, { id: -1, type, level: 1, rank: 0, x: 0, y: 0 })
        ghost.setAlpha(0.65)
        ghostType = type
      }
      ghost.setPosition(ghostCell.x + 0.5, ghostCell.y + 0.5, e)
    },
    destroy() {
      ghost?.destroy()
      g.destroy()
    },
  }
}
