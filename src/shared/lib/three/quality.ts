// Профиль качества рендера: чистые данные без three и DOM (окружение передаётся аргументом).

export type QualityLevel = 'high' | 'low'

export interface QualityProfile {
  level: QualityLevel
  /** Верхняя граница devicePixelRatio. */
  dprCap: number
  antialias: boolean
  /** Множители числа частиц, следов, стрелок пути и вспышек (1 = как на десктопе). */
  particleMul: number
  trailMul: number
  arrowMul: number
  flashMul: number
  /** Лимит одновременно активных эффектов. */
  maxActiveEffects: number
}

export const QUALITY_PROFILES: Record<QualityLevel, QualityProfile> = {
  high: {
    level: 'high',
    dprCap: 2,
    antialias: true,
    particleMul: 1,
    trailMul: 1,
    arrowMul: 1,
    flashMul: 1,
    maxActiveEffects: 128,
  },
  low: {
    level: 'low',
    dprCap: 1.5,
    antialias: false,
    particleMul: 0.4,
    trailMul: 0.5,
    arrowMul: 0.5,
    flashMul: 0.5,
    maxActiveEffects: 48,
  },
}

export interface QualityEnv {
  /** Результат matchMedia('(pointer: coarse)'). */
  coarsePointer: boolean
  /** location.search, например '?quality=low'. */
  search: string
}

/** URL-параметр quality=low|high приоритетнее; иначе тач (coarse) → low. */
export function pickQuality(env: QualityEnv): QualityProfile {
  const q = new URLSearchParams(env.search).get('quality')
  if (q === 'low' || q === 'high') return QUALITY_PROFILES[q]
  return QUALITY_PROFILES[env.coarsePointer ? 'low' : 'high']
}

/** Масштабирует число с округлением вверх, минимум 1 при исходном > 0. */
export function scaleCount(base: number, mul: number): number {
  return base > 0 ? Math.max(1, Math.ceil(base * mul)) : 0
}
