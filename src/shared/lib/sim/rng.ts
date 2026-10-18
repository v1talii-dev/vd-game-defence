// mulberry32: всё состояние ГСЧ — одно uint32, поэтому оно лежит прямо в состоянии боя
export function seedRng(seed: number): number {
  return seed >>> 0
}

// возвращает число в [0, 1) и новое состояние ГСЧ
export function nextRandom(state: number): [value: number, next: number] {
  const next = (state + 0x6d2b79f5) >>> 0
  let t = next
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next]
}
