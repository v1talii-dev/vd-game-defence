import type Phaser from 'phaser'
import type { LevelData } from '@/entities/level'
import { cellDiamond, cellToScreen, depthOf, tileCenterToScreen } from '@/shared/lib/iso'

/** Центральная высота: клетки [x0, x1] x [y0, y1], подъём в пикселях */
const HILL = { x0: 10, x1: 13, y0: 7, y1: 10, height: 10 }

const key = (x: number, y: number) => `${x},${y}`

export function elevationAtTile(x: number, y: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  return ix >= HILL.x0 && ix <= HILL.x1 && iy >= HILL.y0 && iy <= HILL.y1 ? HILL.height : 0
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

function sand(x: number, y: number): number {
  // лёгкая вариация без ГСЧ: детерминированный хэш клетки
  const h = ((x * 73856093) ^ (y * 19349663)) >>> 0
  const v = h % 5
  return [0xd8c08a, 0xd4bb83, 0xdcc491, 0xd1b87e, 0xdac28c][v]!
}

function poly(g: Phaser.GameObjects.Graphics, pts: { x: number; y: number }[], dy = 0) {
  g.fillPoints(
    pts.map((p) => ({ x: p.x, y: p.y - dy })),
    true,
  )
}

export interface Terrain {
  buildable: Set<string>
  /** Подсветка клеток, куда можно строить; occupied — занятые башнями */
  showBuildable(on: boolean, occupied: Set<string>): void
  destroy(): void
}

export function drawTerrain(scene: Phaser.Scene, level: LevelData): Terrain {
  const ground = scene.add.graphics().setDepth(-1e6)
  const road = pathTiles(level.path)
  const buildable = new Set(level.buildable.map((p) => key(p.x, p.y)))

  for (let j = 0; j < level.height; j++) {
    for (let i = 0; i < level.width; i++) {
      const onRoad = road.has(key(i, j))
      ground.fillStyle(onRoad ? 0x9a7a4e : sand(i, j), 1)
      poly(ground, cellDiamond({ x: i, y: j }))
      ground.lineStyle(1, 0x000000, 0.06)
      ground.strokePoints(cellDiamond({ x: i, y: j }), true)
    }
  }
  // высота: плиты поднимаются в порядке i + j, стены прячутся за соседями
  for (let s = HILL.x0 + HILL.y0; s <= HILL.x1 + HILL.y1; s++) {
    for (let i = HILL.x0; i <= HILL.x1; i++) {
      const j = s - i
      if (j < HILL.y0 || j > HILL.y1) continue
      const [top, right, bottom, left] = cellDiamond({ x: i, y: j })
      const h = HILL.height
      ground.fillStyle(0x8c7448, 1)
      poly(ground, [
        left!,
        bottom!,
        { x: bottom!.x, y: bottom!.y - h },
        { x: left!.x, y: left!.y - h },
      ])
      ground.fillStyle(0x6e5a38, 1)
      poly(ground, [
        bottom!,
        right!,
        { x: right!.x, y: right!.y - h },
        { x: bottom!.x, y: bottom!.y - h },
      ])
      ground.fillStyle(sand(i + 3, j + 5), 1)
      poly(ground, [top!, right!, bottom!, left!], h)
      ground.lineStyle(1, 0x000000, 0.08)
      ground.strokePoints(
        [top!, right!, bottom!, left!].map((p) => ({ x: p.x, y: p.y - h })),
        true,
      )
    }
  }

  // спавн и штаб
  const marks = scene.add.graphics()
  const sp = cellToScreen(level.spawn)
  marks.fillStyle(0xaa2a2a, 0.9)
  marks.fillEllipse(sp.x, sp.y, 40, 20)
  marks.setDepth(depthOf(level.spawn) - 1)
  const hq = scene.add.graphics()
  const hp = cellToScreen(level.hq)
  hq.setPosition(hp.x, hp.y)
  hq.setDepth(depthOf(level.hq))
  hq.fillStyle(0x3a4a5a, 1)
  hq.fillPoints(
    [
      { x: 0, y: -16 },
      { x: 36, y: 0 },
      { x: 0, y: 16 },
      { x: -36, y: 0 },
    ],
    true,
  )
  hq.fillStyle(0x5a7a9a, 1)
  hq.fillRect(-18, -34, 36, 26)
  hq.fillStyle(0xe0e8f0, 1)
  hq.fillTriangle(-18, -34, 18, -34, 0, -46)

  const hi = scene.add.graphics().setDepth(-5e5).setVisible(false)
  let lastKey = ''

  return {
    buildable,
    showBuildable(on, occupied) {
      hi.setVisible(on)
      if (!on) {
        lastKey = ''
        return
      }
      const k = [...occupied].join('|')
      if (k === lastKey) return
      lastKey = k
      hi.clear()
      for (const p of level.buildable) {
        if (occupied.has(key(p.x, p.y))) continue
        const c = tileCenterToScreen(p)
        const e = elevationAtTile(p.x, p.y)
        hi.fillStyle(0x66e070, 0.35)
        hi.fillPoints(
          cellDiamond(p).map((q) => ({ x: q.x, y: q.y - e })),
          true,
        )
        hi.lineStyle(1, 0xb8ffbf, 0.8)
        hi.strokeEllipse(c.x, c.y - e, 10, 5)
      }
    },
    destroy() {
      ground.destroy()
      marks.destroy()
      hq.destroy()
      hi.destroy()
    },
  }
}

export { key as tileKey }
