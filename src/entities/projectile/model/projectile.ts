import { TICK_RATE } from '@/shared/config'
import { dist3, lerp, type Vec3 } from '@/shared/lib/sim'

export type ProjectileKind = 'bullet' | 'rocket' | 'shell'

export interface ProjectileState {
  id: number
  // башня-стрелок; 0 у снаряда врага (hostile)
  towerId: number
  // снаряд врага: стреляет attackerId, цель targetId — id башни
  hostile: boolean
  attackerId: number
  targetId: number
  kind: ProjectileKind
  // текущая позиция, в клетках (z — высота)
  x: number
  y: number
  z: number
  // точка вылета (дуло)
  fromX: number
  fromY: number
  fromZ: number
  // точка попадания: обновляется за живой целью, после гибели остаётся последней известной
  tx: number
  ty: number
  tz: number
  // прогресс полёта 0..1
  t: number
  // прирост t за тик (speed / TICK_RATE / дистанция при выстреле)
  dt: number
  // высота дуги над прямой, в клетках
  arc: number
  // клеток в секунду
  speed: number
  // урон с учётом ранга, без модификатора брони
  damage: number
  // ключ DamageType башни (тип хранит entities/tower)
  damageType: string
}

export interface ProjectileLaunch {
  id: number
  towerId: number
  hostile?: boolean
  attackerId?: number
  targetId: number
  kind: ProjectileKind
  from: Vec3
  aim: Vec3
  speed: number
  arcFactor: number
  minArc: number
  damage: number
  damageType: string
}

export function createProjectile(l: ProjectileLaunch): ProjectileState {
  const d = dist3(l.from, l.aim)
  return {
    id: l.id,
    towerId: l.towerId,
    hostile: l.hostile ?? false,
    attackerId: l.attackerId ?? 0,
    targetId: l.targetId,
    kind: l.kind,
    x: l.from.x,
    y: l.from.y,
    z: l.from.z,
    fromX: l.from.x,
    fromY: l.from.y,
    fromZ: l.from.z,
    tx: l.aim.x,
    ty: l.aim.y,
    tz: l.aim.z,
    t: 0,
    dt: d > 0 ? l.speed / TICK_RATE / d : 1,
    arc: Math.max(l.minArc, l.arcFactor * d),
    speed: l.speed,
    damage: l.damage,
    damageType: l.damageType,
  }
}

// bullet — линейно, rocket — разгон t²
function ease(kind: ProjectileKind, t: number): number {
  return kind === 'rocket' ? t * t : t
}

// позиция снаряда по прогрессу t (SPEC §4.7)
export function projectilePosition(p: ProjectileState, t: number): Vec3 {
  const e = ease(p.kind, t)
  return {
    x: lerp(p.fromX, p.tx, e),
    y: lerp(p.fromY, p.ty, e),
    z: Math.max(0, lerp(p.fromZ, p.tz, e) + p.arc * 4 * t * (1 - t)),
  }
}

// сдвигает снаряд на один тик; aim — новая точка попадания живой цели; true — долетел
export function advanceProjectile(p: ProjectileState, aim?: Vec3): boolean {
  if (aim) {
    p.tx = aim.x
    p.ty = aim.y
    p.tz = aim.z
  }
  p.t = Math.min(1, p.t + p.dt)
  Object.assign(p, projectilePosition(p, p.t))
  return p.t >= 1
}
