import type Phaser from 'phaser'
import { ensureFxTextures, fxOf } from '@/shared/lib/fx'
import { cellToScreen, depthOf, interpolated, trackPosition, type Tracked } from '@/shared/lib/iso'
import { EXPLODE_FRAMES, faceFromScreen, hasSprite, spriteKey } from '@/shared/lib/sprites'
import type { EnemyType } from '../config/enemies'
import type { EnemyState } from '../model/enemy'

const AIR_HEIGHT = 28
const BAR_W = 24
// масштаб спрайта 88x108 под тайл 64x32; босс крупнее
const SCALE: Partial<Record<EnemyType, number>> = { boss: 1.25 }
const BASE_SCALE = 0.72
// ширина тени на земле по типу врага, px
const SHADOW_W: Partial<Record<EnemyType, number>> = { boss: 96, tank: 70, technical: 56 }

function drawBody(g: Phaser.GameObjects.Graphics, type: EnemyType, sprite: boolean) {
  g.clear()
  if (sprite) {
    // со спрайтом остаётся только тень летающих
    if (type === 'drone') {
      g.fillStyle(0x3a3a3a, 0.35)
      g.fillEllipse(0, 0, 16, 8)
    }
    return
  }
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
  /** экранная позиция корня */
  readonly x: number
  readonly y: number
  readonly scale: number
  setPosition(cellX: number, cellY: number): void
  setHp(hp: number, maxHp: number): void
  destroy(): void
}

export function createEnemyView(scene: Phaser.Scene, e: EnemyState): EnemyView {
  const body = scene.add.graphics()
  const bar = scene.add.graphics()
  const scale = SCALE[e.type] ?? BASE_SCALE
  const sprite = hasSprite(scene, e.type)
    ? scene.add
        .image(0, e.air ? -AIR_HEIGHT : 0, spriteKey(e.type, 0))
        .setOrigin(0.5, 0.8)
        .setScale(scale)
    : null
  ensureFxTextures(scene)
  const sw = SHADOW_W[e.type] ?? 44
  const shadow = scene.add
    .image(2, 2, 'fx_shadow')
    .setDisplaySize(sw, sw / 2)
    .setAlpha(e.air ? 0.5 : 0.85)
  const root = scene.add.container(0, 0, sprite ? [shadow, body, sprite, bar] : [shadow, body, bar])
  drawBody(body, e.type, !!sprite)
  let face = 0
  let prev: { x: number; y: number } | null = null
  const barY = (e.air ? -AIR_HEIGHT : e.type === 'boss' ? -44 : -24) - 8 - (sprite ? 32 : 0)
  let lastHp = NaN
  const view: EnemyView = {
    get x() {
      return root.x
    },
    get y() {
      return root.y
    },
    scale,
    setPosition(x, y) {
      const p = cellToScreen({ x, y })
      if (sprite && prev) {
        // направление по смещению на экране; при остановке остаёмся с прежним
        const f = faceFromScreen(p.x - prev.x, p.y - prev.y)
        if (f !== null && f !== face) {
          face = f
          sprite.setTexture(spriteKey(e.type, f))
        }
      }
      prev = p
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
  const items = new Map<number, { view: EnemyView; pos: Tracked; gen: number }>()
  let gen = 0
  // пул спрайтов взрыва
  const pool: Phaser.GameObjects.Sprite[] = []
  if (scene.textures.exists('explode_0') && !scene.anims.exists('explode')) {
    scene.anims.create({
      key: 'explode',
      frames: Array.from({ length: EXPLODE_FRAMES }, (_, i) => ({ key: `explode_${i}` })),
      frameRate: 24,
    })
  }
  return {
    /** взрыв на месте врага; вызывать до следующего sync, пока вид ещё жив */
    explode(id: number) {
      const it = items.get(id)
      if (!it || !scene.anims.exists('explode')) return
      const s = pool.pop() ?? scene.add.sprite(0, 0, 'explode_0').setOrigin(0.5, 0.8)
      s.setVisible(true)
        .setPosition(it.view.x, it.view.y)
        .setScale(it.view.scale)
        .setDepth(it.view.y + 2000)
      s.play('explode')
      const fx = fxOf(scene)
      fx.flash(it.view.x, it.view.y - 14, 0xffa040, 1.8 * it.view.scale)
      fx.ring(it.view.x, it.view.y, 1.1 * it.view.scale, 0xffc070)
      fx.smoke(it.view.x, it.view.y - 18, 1.6 * it.view.scale)
      fx.smoke(it.view.x + 8, it.view.y - 10, 1.2 * it.view.scale)
      fx.scorch(it.view.x, it.view.y, 0.7 * it.view.scale)
      s.once('animationcomplete', () => {
        s.setVisible(false)
        pool.push(s)
      })
    },
    sync(enemies: readonly EnemyState[], tick: number, alpha: number) {
      gen++
      for (const e of enemies) {
        let it = items.get(e.id)
        if (!it) {
          it = {
            view: createEnemyView(scene, e),
            pos: trackPosition(undefined, e.x, e.y, tick),
            gen,
          }
          items.set(e.id, it)
        }
        it.gen = gen
        trackPosition(it.pos, e.x, e.y, tick)
        const p = interpolated(it.pos, alpha)
        it.view.setPosition(p.x, p.y)
        it.view.setHp(e.hp, e.maxHp)
      }
      for (const [id, it] of items) {
        if (it.gen !== gen) {
          it.view.destroy()
          items.delete(id)
        }
      }
    },
    clear() {
      for (const it of items.values()) it.view.destroy()
      items.clear()
      for (const s of pool) s.destroy()
      pool.length = 0
    },
  }
}
