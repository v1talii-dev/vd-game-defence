import { TICK_RATE } from '@/shared/config'
import { ENEMIES, type EnemyType } from '../config/enemies'

export interface EnemyState {
  id: number
  type: EnemyType
  // позиция в клетках (float)
  x: number
  y: number
  // высота над землёй, в клетках
  z: number
  // пройдено по пути, в клетках
  distance: number
  hp: number
  maxHp: number
  air: boolean
  // уже выпустил подкрепление (для босса)
  spawnedMinions: boolean
}

export interface PathGeometry {
  points: readonly { x: number; y: number }[]
  // накопленная длина до каждой точки
  cumulative: number[]
  length: number
}

export function createPathGeometry(points: readonly { x: number; y: number }[]): PathGeometry {
  const cumulative = [0]
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!
    const b = points[i]!
    cumulative.push(cumulative[i - 1]! + Math.hypot(b.x - a.x, b.y - a.y))
  }
  return { points, cumulative, length: cumulative[cumulative.length - 1]! }
}

export function pointAt(geom: PathGeometry, distance: number): { x: number; y: number } {
  const d = Math.max(0, Math.min(distance, geom.length))
  let i = 1
  while (i < geom.points.length - 1 && geom.cumulative[i]! < d) i++
  const a = geom.points[i - 1]!
  const b = geom.points[i]!
  const segLen = geom.cumulative[i]! - geom.cumulative[i - 1]!
  const t = segLen > 0 ? (d - geom.cumulative[i - 1]!) / segLen : 0
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

export function createEnemy(
  id: number,
  type: EnemyType,
  geom: PathGeometry,
  distance = 0,
): EnemyState {
  const cfg = ENEMIES[type]
  return {
    id,
    type,
    ...pointAt(geom, distance),
    z: cfg.flightHeight,
    distance,
    hp: cfg.hp,
    maxHp: cfg.hp,
    air: cfg.armor === 'air',
    spawnedMinions: false,
  }
}

// сдвигает врага на один тик; true — дошёл до штаба
export function advanceEnemy(enemy: EnemyState, geom: PathGeometry): boolean {
  enemy.distance += ENEMIES[enemy.type].speed / TICK_RATE
  Object.assign(enemy, pointAt(geom, enemy.distance))
  return enemy.distance >= geom.length
}
