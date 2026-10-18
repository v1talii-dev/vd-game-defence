export type SpeedParam = 1 | 2 | 8

export interface DebugParams {
  debug: boolean
  seed?: number
  wave?: number
  money?: number
  speed?: SpeedParam
}

function int(v: string | null, min: number): number | undefined {
  if (v === null || !/^-?\d+$/.test(v.trim())) return undefined
  const n = Number(v)
  return Number.isSafeInteger(n) && n >= min ? n : undefined
}

/** Разбирает ?seed= ?wave= ?money= ?speed= ?debug=1; мусорные значения игнорируются */
export function parseDebugParams(query: string): DebugParams {
  const q = new URLSearchParams(query)
  const speed = int(q.get('speed'), 1)
  return {
    debug: q.get('debug') === '1',
    seed: int(q.get('seed'), 0),
    wave: int(q.get('wave'), 0),
    money: int(q.get('money'), 0),
    speed: speed === 1 || speed === 2 || speed === 8 ? speed : undefined,
  }
}

/** Параметры из location: и `/?seed=1#/battle`, и `#/battle?seed=1` */
export function readLocationParams(loc: { search: string; hash: string }): DebugParams {
  const h = loc.hash.indexOf('?')
  const merged = new URLSearchParams(loc.search)
  if (h >= 0) new URLSearchParams(loc.hash.slice(h + 1)).forEach((v, k) => merged.set(k, v))
  return parseDebugParams(merged.toString())
}
