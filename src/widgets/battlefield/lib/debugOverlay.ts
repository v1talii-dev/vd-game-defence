import type Phaser from 'phaser'
import type { Battle } from '@/entities/battle'
import type { LevelData } from '@/entities/level'
import { towerStats } from '@/entities/tower'
import { cellDiamond, cellToScreen, radiusToScreen } from '@/shared/lib/iso'

/** F3 / ?debug=1: FPS, тик, сущности, сетка, buildable-маска, путь, радиусы и цели башен */
export function createDebugOverlay(scene: Phaser.Scene, level: LevelData, enabled: boolean) {
  const stat = scene.add
    .text(0, 0, '', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#00ff88',
      backgroundColor: '#000a',
    })
    .setDepth(1e7)
    .setOrigin(0, 0)
  const fixed = scene.add.graphics().setDepth(1e6) // сетка, маска, путь
  const dyn = scene.add.graphics().setDepth(1e6 + 1) // радиусы и цели

  for (let j = 0; j < level.height; j++) {
    for (let i = 0; i < level.width; i++) {
      fixed.lineStyle(1, 0xffffff, 0.18)
      fixed.strokePoints(cellDiamond({ x: i, y: j }), true)
    }
  }
  fixed.fillStyle(0x00ff00, 0.25)
  for (const b of level.buildable) fixed.fillPoints(cellDiamond(b), true)
  fixed.lineStyle(3, 0xff3366, 1)
  fixed.strokePoints(
    level.path.map((p) => cellToScreen(p)),
    false,
  )

  let on = enabled
  const apply = () => {
    stat.setVisible(on)
    fixed.setVisible(on)
    dyn.setVisible(on)
  }
  apply()

  return {
    toggle() {
      on = !on
      apply()
    },
    update(battle: Battle) {
      if (!on) return
      const cam = scene.cameras.main
      const s = battle.state
      stat.setScale(1 / cam.zoom)
      stat.setPosition(cam.worldView.x + 8 / cam.zoom, cam.worldView.y + 8 / cam.zoom)
      stat.setText(
        `FPS ${Math.round(scene.game.loop.actualFps)}\ntick ${s.tick}\n` +
          `враги ${s.enemies.length} башни ${s.towers.length} снаряды ${s.projectiles.length}`,
      )
      dyn.clear()
      for (const t of s.towers) {
        const c = cellToScreen(t)
        const { rx, ry } = radiusToScreen(towerStats(t.type, t.level, t.rank).range)
        dyn.lineStyle(1, 0xffff00, 0.7)
        dyn.strokeEllipse(c.x, c.y, rx * 2, ry * 2)
        const target = s.enemies.find((e) => e.id === t.targetId)
        if (target) {
          const e = cellToScreen(target)
          dyn.lineStyle(1, 0xff4444, 1)
          dyn.lineBetween(c.x, c.y, e.x, e.y)
        }
      }
    },
    destroy() {
      stat.destroy()
      fixed.destroy()
      dyn.destroy()
    },
  }
}
