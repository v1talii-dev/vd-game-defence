import type Phaser from 'phaser'
import { cellToScreen, depthOf, interpolated, trackPosition, type Tracked } from '@/shared/lib/iso'
import type { EnemyType } from '../config/enemies'
import type { EnemyState } from '../model/enemy'

const AIR_HEIGHT = 28
const BAR_W = 24

function drawBody(g: Phaser.GameObjects.Graphics, type: EnemyType) {
  g.clear()
  switch (type) {
    case 'grunt':
      g.fillStyle(0xb5533c, 1)
      g.fillCircle(0, -6, 6)
      break
    case 'grenadier':
      g.fillStyle(0x7a2e2e, 1)
      g.fillCircle(0, -8, 8)
      g.fillStyle(0xe0c060, 1)
      g.fillRect(4, -12, 6, 3)
      break
    case 'technical':
      g.fillStyle(0xd98a2e, 1)
      g.fillRect(-12, -10, 24, 10)
      g.fillStyle(0x333333, 1)
      g.fillCircle(-8, 0, 3)
      g.fillCircle(8, 0, 3)
      break
    case 'tank':
      g.fillStyle(0x5a5a3a, 1)
      g.fillRect(-15, -12, 30, 12)
      g.fillStyle(0x7a7a4a, 1)
      g.fillCircle(0, -14, 7)
      g.fillRect(0, -16, 16, 3)
      break
    case 'drone':
      g.fillStyle(0x3a3a3a, 0.35) // тень на земле
      g.fillEllipse(0, 0, 16, 8)
      g.fillStyle(0xcc3355, 1)
      g.fillTriangle(-9, -AIR_HEIGHT + 4, 9, -AIR_HEIGHT + 4, 0, -AIR_HEIGHT - 8)
      g.fillStyle(0xffffff, 0.9)
      g.fillCircle(0, -AIR_HEIGHT, 2)
      break
    case 'boss':
      g.fillStyle(0x2e1f3a, 1)
      g.fillRect(-22, -20, 44, 20)
      g.fillStyle(0x7a3a9a, 1)
      g.fillCircle(0, -24, 12)
      g.fillRect(0, -27, 26, 5)
      break
  }
}

export interface EnemyView {
  setPosition(cellX: number, cellY: number): void
  setHp(hp: number, maxHp: number): void
  destroy(): void
}

export function createEnemyView(scene: Phaser.Scene, e: EnemyState): EnemyView {
  const body = scene.add.graphics()
  const bar = scene.add.graphics()
  const root = scene.add.container(0, 0, [body, bar])
  drawBody(body, e.type)
  const barY = (e.air ? -AIR_HEIGHT : e.type === 'boss' ? -44 : -24) - 8
  let lastHp = NaN
  const view: EnemyView = {
    setPosition(x, y) {
      const p = cellToScreen({ x, y })
      root.setPosition(p.x, p.y)
      root.setDepth(depthOf({ x, y }) + (e.air ? 1000 : 0))
    },
    setHp(hp, maxHp) {
      if (hp === lastHp) return
      lastHp = hp
      bar.clear()
      if (hp >= maxHp) return
      bar.fillStyle(0x000000, 0.7)
      bar.fillRect(-BAR_W / 2 - 1, barY - 1, BAR_W + 2, 5)
      bar.fillStyle(hp / maxHp > 0.5 ? 0x5ac85a : hp / maxHp > 0.25 ? 0xe0c040 : 0xd04040, 1)
      bar.fillRect(-BAR_W / 2, barY, (BAR_W * Math.max(0, hp)) / maxHp, 3)
    },
    destroy: () => root.destroy(),
  }
  return view
}

/** Синхронизирует виды врагов с состоянием по id, с интерполяцией между тиками */
export function createEnemyLayer(scene: Phaser.Scene) {
  const items = new Map<number, { view: EnemyView; pos: Tracked }>()
  return {
    sync(enemies: readonly EnemyState[], tick: number, alpha: number) {
      const seen = new Set<number>()
      for (const e of enemies) {
        seen.add(e.id)
        let it = items.get(e.id)
        if (!it) {
          it = { view: createEnemyView(scene, e), pos: trackPosition(undefined, e.x, e.y, tick) }
          items.set(e.id, it)
        }
        trackPosition(it.pos, e.x, e.y, tick)
        const p = interpolated(it.pos, alpha)
        it.view.setPosition(p.x, p.y)
        it.view.setHp(e.hp, e.maxHp)
      }
      for (const [id, it] of items) {
        if (!seen.has(id)) {
          it.view.destroy()
          items.delete(id)
        }
      }
    },
    clear() {
      for (const it of items.values()) it.view.destroy()
      items.clear()
    },
  }
}
