// 3D-вектор для траекторий (SPEC §4.7): только + − × ÷ и sqrt, без тригонометрии
export interface Vec3 {
  x: number
  y: number
  z: number
}

export function dist3(a: Vec3, b: Vec3): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const dz = b.z - a.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}
