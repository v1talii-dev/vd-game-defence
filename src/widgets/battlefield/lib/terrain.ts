import type Phaser from 'phaser'
import type { LevelData } from '@/entities/level'
import { ensureFxTextures } from '@/shared/lib/fx'
import { cellDiamond, cellToScreen, depthOf, tileCenterToScreen } from '@/shared/lib/iso'
import { BAKE_ORIGIN, HILL_HEIGHT, bakeTerrain } from './terrainBake'

/** Плато: клетки [x0, x1] x [y0, y1], высота подъёма — HILL_HEIGHT px */
const HILL = { x0: 10, x1: 13, y0: 7, y1: 10 }

const key = (x: number, y: number) => `${x},${y}`

export function elevationAtTile(x: number, y: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  return ix >= HILL.x0 && ix <= HILL.x1 && iy >= HILL.y0 && iy <= HILL.y1 ? HILL_HEIGHT : 0
}

/** Клетки, через которые проходит полилиния пути (пути осевые, шаг выборки 0.25 клетки) */
export function pathTiles(path: readonly { x: number; y: number }[]): Set<string> {
  const out = new Set<string>()
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!
    const b = path[i]!
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 4))
    for (let s = 0; s <= n; s++) {
      const x = a.x + ((b.x - a.x) * s) / n
      const y = a.y + ((b.y - a.y) * s) / n
      out.add(key(Math.floor(x), Math.floor(y)))
    }
  }
  return out
}

export interface Terrain {
  buildable: Set<string>
  /** Подсветка клеток, куда можно строить; occupied — занятые башнями */
  showBuildable(on: boolean, occupied: Set<string>): void
  destroy(): void
}

/** Загрузка текстур земли (бесшовные CC0 от ambientCG) */
export function preloadTerrain(
  scene: Phaser.Scene,
  base = `${import.meta.env.BASE_URL}assets/terrain/`,
) {
  scene.load.image('tx_sand', `${base}sand.jpg`)
  scene.load.image('tx_sandLight', `${base}sand-light.jpg`)
  scene.load.image('tx_sandDry', `${base}sand-dry.jpg`)
  scene.load.image('tx_road', `${base}road.jpg`)
  scene.load.image('tx_rock', `${base}rock.jpg`)
}

export function drawTerrain(scene: Phaser.Scene, level: LevelData): Terrain {
  ensureFxTextures(scene)
  const buildable = new Set(level.buildable.map((p) => key(p.x, p.y)))
  const tex = (k: string) => scene.textures.get(k).getSourceImage() as CanvasImageSource
  const canvas = bakeTerrain(
    level,
    {
      sand: tex('tx_sand'),
      sandLight: tex('tx_sandLight'),
      sandDry: tex('tx_sandDry'),
      road: tex('tx_road'),
      rock: tex('tx_rock'),
    },
    HILL,
  )
  if (scene.textures.exists('terrain')) scene.textures.remove('terrain')
  scene.textures.addCanvas('terrain', canvas)
  const ground = scene.add.image(BAKE_ORIGIN.x, BAKE_ORIGIN.y, 'terrain').setOrigin(0, 0)
  ground.setDepth(-1e6)

  // штаб и его тень на земле
  const hp = cellToScreen(level.hq)
  const hqShadow = scene.add
    .image(hp.x + 6, hp.y + 4, 'fx_shadow')
    .setDisplaySize(130, 52)
    .setAlpha(0.7)
    .setDepth(depthOf(level.hq) - 1)
  const hqImg = scene.add
    .image(hp.x, hp.y, 'hq_0')
    .setOrigin(0.5, 0.8)
    .setScale(1.15)
    .setDepth(depthOf(level.hq))

  // плывущие тени облаков: медленный дрейф
  const clouds = [0, 1, 2].map((i) =>
    scene.add
      .image(300 + i * 500, 150 + i * 220, 'fx_shadow')
      .setDisplaySize(520 + i * 120, 240 + i * 50)
      .setAlpha(0.14)
      .setDepth(-4.5e5),
  )
  const cloudTween = scene.tweens.add({
    targets: clouds,
    x: '+=700',
    duration: 90_000,
    repeat: -1,
    yoyo: true,
    ease: 'Sine.easeInOut',
  })

  // тёмная виньетка по краям экрана
  const vignette = scene.add
    .image(0, 0, 'fx_vignette')
    .setOrigin(0, 0)
    .setScrollFactor(0)
    .setDepth(1e7)
  const fitVignette = () => vignette.setDisplaySize(scene.scale.width, scene.scale.height)
  fitVignette()
  scene.scale.on('resize', fitVignette)

  const hi = scene.add.graphics().setDepth(-5e5).setVisible(false)
  const pulse = scene.tweens.add({
    targets: hi,
    alpha: { from: 0.55, to: 1 },
    duration: 700,
    yoyo: true,
    repeat: -1,
  })
  let lastSet: Set<string> | null = null

  return {
    buildable,
    showBuildable(on, occupied) {
      hi.setVisible(on)
      if (!on) {
        lastSet = null
        return
      }
      // вызывающий отдаёт один и тот же Set, пока набор занятых клеток не менялся
      if (occupied === lastSet) return
      lastSet = occupied
      hi.clear()
      for (const p of level.buildable) {
        if (occupied.has(key(p.x, p.y))) continue
        const c = tileCenterToScreen(p)
        const e = elevationAtTile(p.x, p.y)
        const pts = cellDiamond(p).map((q) => ({
          x: c.x + (q.x - c.x) * 0.82,
          y: c.y - e + (q.y - c.y) * 0.82,
        }))
        hi.fillStyle(0x7cff8a, 0.3)
        hi.fillPoints(pts, true)
        hi.lineStyle(2, 0xc8ffd0, 0.9)
        hi.strokePoints(pts, true)
      }
    },
    destroy() {
      ground.destroy()
      hqShadow.destroy()
      hqImg.destroy()
      cloudTween.remove()
      for (const c of clouds) c.destroy()
      scene.scale.off('resize', fitVignette)
      vignette.destroy()
      pulse.remove()
      hi.destroy()
    },
  }
}

export { key as tileKey }
