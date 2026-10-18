import { TICK_RATE } from '@/shared/config'

export interface ProjectileState {
  id: number
  towerId: number
  targetId: number
  // текущая позиция и точка назначения, в клетках
  x: number
  y: number
  tx: number
  ty: number
  // клеток в секунду
  speed: number
  // урон с учётом ранга, без модификатора брони
  damage: number
  // ключ DamageType башни (тип хранит entities/tower)
  damageType: string
  // радиус сплэша, 0 — бьёт только цель
  splash: number
  // самонаводящийся снаряд каждый тик обновляет tx/ty по цели, фугас летит в точку
  homing: boolean
}

// сдвигает снаряд на один тик; true — долетел до точки назначения
export function advanceProjectile(p: ProjectileState): boolean {
  const step = p.speed / TICK_RATE
  const dx = p.tx - p.x
  const dy = p.ty - p.y
  const d = Math.hypot(dx, dy)
  if (d <= step) {
    p.x = p.tx
    p.y = p.ty
    return true
  }
  p.x += (dx / d) * step
  p.y += (dy / d) * step
  return false
}
