import { projectilePosition, type ProjectileState } from '@/entities/projectile'
import type { Vec3 } from '@/shared/lib/sim'

export function visualMuzzle(
  local: readonly [number, number, number],
  x: number,
  y: number,
  baseHeight: number,
  yaw: number,
  scale: number,
): Vec3 {
  const [side, height, forward] = local
  return {
    x: x + (side * Math.cos(yaw) + forward * Math.sin(yaw)) * scale,
    y: y + (forward * Math.cos(yaw) - side * Math.sin(yaw)) * scale,
    z: baseHeight + height * scale,
  }
}

export function visualProjectilePosition(p: ProjectileState, t: number, from?: Vec3): Vec3 {
  const position = projectilePosition(p, t)
  if (from) {
    const remaining = 1 - (p.kind === 'rocket' ? t * t : t)
    position.x += (from.x - p.fromX) * remaining
    position.y += (from.y - p.fromY) * remaining
    position.z += (from.z - p.fromZ) * remaining
  }
  return position
}
