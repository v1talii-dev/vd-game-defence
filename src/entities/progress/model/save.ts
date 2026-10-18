export const SAVE_KEY = 'vdgd:save:v1'
export const SAVE_VERSION = 1

export interface LevelResult {
  stars: number
  bestHp: number
}

export interface Settings {
  volume: number
  sfx: boolean
  showRanges: boolean
}

export interface SaveData {
  version: number
  levels: Record<string, LevelResult>
  settings: Settings
  tutorialDone: boolean
}

/** Минимальный Storage-подобный интерфейс, чтобы model не знала про localStorage. */
export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export interface LoadResult {
  data: SaveData
  storageAvailable: boolean
}

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    levels: {},
    settings: { volume: 0.7, sfx: true, showRanges: false },
    tutorialDone: false,
  }
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
const num = (v: unknown, min: number, max: number): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : null

/** Разбирает сырую строку; любое отклонение от схемы заменяется дефолтом поля или всего сохранения. */
export function parseSave(raw: string): SaveData {
  const def = defaultSave()
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    console.warn('[progress] сохранение повреждено, используем значения по умолчанию')
    return def
  }
  if (!isObj(json) || json.version !== SAVE_VERSION) {
    console.warn('[progress] неизвестная версия сохранения, используем значения по умолчанию')
    return def
  }
  if (isObj(json.levels)) {
    for (const [id, r] of Object.entries(json.levels)) {
      const stars = isObj(r) ? num(r.stars, 0, 3) : null
      const bestHp = isObj(r) ? num(r.bestHp, 0, 1000) : null
      if (stars === null || bestHp === null) {
        console.warn(`[progress] результат уровня "${id}" повреждён, пропускаем`)
        continue
      }
      def.levels[id] = { stars: Math.floor(stars), bestHp }
    }
  }
  if (isObj(json.settings)) {
    const s = json.settings
    def.settings.volume = num(s.volume, 0, 1) ?? def.settings.volume
    for (const k of ['sfx', 'showRanges'] as const) {
      if (typeof s[k] === 'boolean') def.settings[k] = s[k]
    }
  }
  if (typeof json.tutorialDone === 'boolean') def.tutorialDone = json.tutorialDone
  return def
}

export function loadSave(storage: StorageLike | null): LoadResult {
  if (!storage) return { data: defaultSave(), storageAvailable: false }
  try {
    const raw = storage.getItem(SAVE_KEY)
    return { data: raw === null ? defaultSave() : parseSave(raw), storageAvailable: true }
  } catch {
    console.warn('[progress] хранилище недоступно, сохранения отключены')
    return { data: defaultSave(), storageAvailable: false }
  }
}

/** Возвращает false, если записать не удалось (квота, приватный режим). */
export function writeSave(storage: StorageLike | null, data: SaveData): boolean {
  if (!storage) return false
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(data))
    return true
  } catch {
    console.warn('[progress] не удалось записать сохранение')
    return false
  }
}

/** Сохраняет лучший результат: больше звёзд, при равенстве — больше HP. */
export function withResult(data: SaveData, levelId: string, stars: number, hp: number): SaveData {
  const prev = data.levels[levelId]
  const better = !prev || stars > prev.stars || (stars === prev.stars && hp > prev.bestHp)
  if (!better) return data
  return { ...data, levels: { ...data.levels, [levelId]: { stars, bestHp: hp } } }
}
