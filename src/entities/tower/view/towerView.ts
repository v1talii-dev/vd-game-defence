import type Phaser from 'phaser'
import { ensureFxTextures, fxOf } from '@/shared/lib/fx'
import { DEFAULT_ISO, cellToScreen, depthOf } from '@/shared/lib/iso'
import { faceFromScreen, hasSprite, spriteKey } from '@/shared/lib/sprites'
import type { TowerType } from '../config/towers'
import type { TowerState } from '../model/tower'

type TowerLike = Pick<TowerState, 'id' | 'type' | 'level' | 'rank' | 'x' | 'y'>

// цвета заглушек: основной и тёмный
const COLORS: Record<TowerType, { main: number; dark: number }> = {
  machineGun: { main: 0xd9b84a, dark: 0x7a6420 },
  rocket: { main: 0xd96a4a, dark: 0x7a3320 },
  mortar: { main: 0x8a8f5a, dark: 0x45482a },
  antiAir: { main: 0x4aa6d9, dark: 0x205a7a },
}

const SCALE = 0.78
// цвет вспышки выстрела по типу башни
const FLASH: Record<TowerType, number> = {
  machineGun: 0xffe08a,
  rocket: 0xff9a4a,
  mortar: 0xffb060,
  antiAir: 0x8adfff,
}

export interface TowerView {
  update(t: TowerLike): void
  setSelected(on: boolean): void
  setPosition(cellX: number, cellY: number, elevation?: number): void
  setAlpha(a: number): void
  /** повернуть к точке (в клетках) */
  aimAt(cellX: number, cellY: number): void
  /** анимация выстрела */
  fire(): void
  destroy(): void
}

function drawBody(
  g: Phaser.GameObjects.Graphics,
  t: TowerLike,
  selected: boolean,
  sprite: boolean,
) {
  const hw = DEFAULT_ISO.tileWidth / 2 - 8
  const hh = DEFAULT_ISO.tileHeight / 2 - 4
  g.clear()
  if (selected) {
    g.lineStyle(2, 0xffffff, 1)
    g.strokeEllipse(0, 0, hw * 2 + 8, hh * 2 + 4)
  }
  if (!sprite) drawStub(g, t, hw, hh)
  // уровень: точки у основания
  g.fillStyle(0xffffff, 1)
  for (let i = 0; i < t.level; i++) g.fillCircle((i - (t.level - 1) / 2) * 7, hh + 6, 2.5)
  // ранг: шевроны над башней
  g.lineStyle(2, 0xffe066, 1)
  for (let i = 0; i < t.rank; i++) {
    const y = (sprite ? -62 : -34) - i * 5
    g.lineBetween(-5, y, 0, y - 4)
    g.lineBetween(0, y - 4, 5, y)
  }
}

function drawStub(g: Phaser.GameObjects.Graphics, t: TowerLike, hw: number, hh: number) {
  const { main, dark } = COLORS[t.type]
  // основание
  g.fillStyle(dark, 1)
  g.fillPoints(
    [
      { x: 0, y: -hh },
      { x: hw, y: 0 },
      { x: 0, y: hh },
      { x: -hw, y: 0 },
    ],
    true,
  )
  g.fillStyle(main, 1)
  switch (t.type) {
    case 'machineGun':
      g.fillRect(-8, -16, 16, 14)
      g.fillStyle(dark, 1)
      g.fillRect(2, -13, 14, 4)
      break
    case 'rocket':
      g.fillRect(-7, -24, 14, 22)
      g.fillStyle(dark, 1)
      g.fillRect(-12, -22, 5, 14)
      g.fillRect(7, -22, 5, 14)
      break
    case 'mortar':
      g.fillCircle(0, -8, 11)
      g.fillStyle(dark, 1)
      g.fillRect(-3, -26, 6, 18)
      break
    case 'antiAir':
      g.fillTriangle(-10, -2, 10, -2, 0, -22)
      g.fillStyle(0xffffff, 0.9)
      g.fillCircle(0, -22, 3)
      break
  }
}

export function createTowerView(scene: Phaser.Scene, t: TowerLike, elev = 0): TowerView {
  const g = scene.add.graphics()
  ensureFxTextures(scene)
  const shadow = scene.add.image(3, 3, 'fx_shadow').setDisplaySize(74, 34).setAlpha(0.85)
  const sprite = hasSprite(scene, t.type)
    ? scene.add.image(0, 0, spriteKey(t.type, 0)).setOrigin(0.5, 0.8).setScale(SCALE)
    : null
  const root = scene.add.container(0, 0, sprite ? [shadow, sprite, g] : [shadow, g])
  let selected = false
  let kType = ''
  let kLevel = -1
  let kRank = -1
  let kSel = false
  let cur = t
  const place = (x: number, y: number, e = elev) => {
    elev = e
    const p = cellToScreen({ x, y })
    root.setPosition(p.x, p.y - elev)
    root.setDepth(depthOf({ x, y }))
  }
  const redraw = () => {
    if (cur.type === kType && cur.level === kLevel && cur.rank === kRank && selected === kSel)
      return
    kType = cur.type
    kLevel = cur.level
    kRank = cur.rank
    kSel = selected
    drawBody(g, cur, selected, !!sprite)
  }
  place(t.x, t.y)
  redraw()
  return {
    update(next) {
      cur = next
      redraw()
    },
    setSelected(on) {
      selected = on
      redraw()
    },
    setPosition: place,
    setAlpha: (a) => root.setAlpha(a),
    aimAt(cx, cy) {
      if (!sprite) return
      const a = cellToScreen({ x: cx, y: cy })
      const b = cellToScreen({ x: cur.x, y: cur.y })
      const f = faceFromScreen(a.x - b.x, a.y - b.y)
      if (f !== null) sprite.setTexture(spriteKey(cur.type, f))
    },
    fire() {
      if (!sprite) return
      // вспышка у дула и клуб дыма
      const fx = fxOf(scene)
      fx.flash(root.x, root.y - 30, FLASH[cur.type], cur.type === 'mortar' ? 1.1 : 0.7)
      if (cur.type !== 'machineGun') fx.smoke(root.x, root.y - 28, 0.8)
      // отдача: короткое сжатие по высоте
      scene.tweens.killTweensOf(sprite)
      sprite.setScale(SCALE)
      scene.tweens.add({
        targets: sprite,
        scaleY: SCALE * 0.9,
        scaleX: SCALE * 1.05,
        duration: 60,
        yoyo: true,
      })
    },
    destroy: () => root.destroy(),
  }
}

/** Синхронизирует виды башен с состоянием симуляции по id */
export function createTowerLayer(
  scene: Phaser.Scene,
  elevationAt: (x: number, y: number) => number = () => 0,
) {
  const views = new Map<number, { v: TowerView; gen: number }>()
  let gen = 0
  return {
    sync(
      towers: readonly TowerState[],
      selectedId: number | null,
      enemies: readonly { id: number; x: number; y: number }[] = [],
    ) {
      gen++
      for (const t of towers) {
        let it = views.get(t.id)
        if (!it) {
          it = { v: createTowerView(scene, t, elevationAt(t.x, t.y)), gen }
          views.set(t.id, it)
        }
        it.gen = gen
        const v = it.v
        v.update(t)
        v.setSelected(t.id === selectedId)
        const target = t.targetId === null ? undefined : enemies.find((e) => e.id === t.targetId)
        if (target) v.aimAt(target.x, target.y)
      }
      for (const [id, it] of views) {
        if (it.gen !== gen) {
          it.v.destroy()
          views.delete(id)
        }
      }
    },
    fire(towerId: number) {
      views.get(towerId)?.v.fire()
    },
    clear() {
      for (const it of views.values()) it.v.destroy()
      views.clear()
    },
  }
}
