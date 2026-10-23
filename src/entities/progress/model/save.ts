export const SAVE_KEY = 'vdgd:save:v2'
export const SAVE_VERSION = 2
export const SAVE_KEY_V1 = 'vdgd:save:v1'

export interface LevelResult {
  stars: number
  bestHp: number
  /** тик победы лучшего прохождения */
  bestTick?: number
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
  /** подсказка «H — клавиши» уже показана */
  helpHintSeen: boolean
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
    helpHintSeen: false,
  }
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
const num = (v: unknown, min: number, max: number): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : null

/** Разбирает сырую строку; любое отклонение от схемы заменяется дефолтом поля или всего сохранения. */
export function parseSave(raw: string, version = SAVE_VERSION): SaveData {
  const def = defaultSave()
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    console.warn('[progress] сохранение повреждено, используем значения по умолчанию')
    return def
  }
  if (!isObj(json) || json.version !== version) {
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
      const bestTick = isObj(r) ? num(r.bestTick, 0, Number.MAX_SAFE_INTEGER) : null
      def.levels[id] = {
        stars: Math.floor(stars),
        bestHp,
        ...(bestTick === null ? {} : { bestTick }),
      }
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
  if (typeof json.helpHintSeen === 'boolean') def.helpHintSeen = json.helpHintSeen
  return def
}

export function loadSave(storage: StorageLike | null): LoadResult {
  if (!storage) return { data: defaultSave(), storageAvailable: false }
  try {
    const raw = storage.getItem(SAVE_KEY)
    if (raw !== null) return { data: parseSave(raw), storageAvailable: true }
    // миграция v1 → v2: ключ v1 не удаляем, откат безопасен
    const old = storage.getItem(SAVE_KEY_V1)
    if (old === null) return { data: defaultSave(), storageAvailable: true }
    const data = parseSave(old, 1)
    writeSave(storage, data)
    return { data, storageAvailable: true }
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
/** Лучший результат: звёзды и bestHp не уменьшаются; bestTick — у прохождения с лучшими звёздами/HP. */
export function withResult(
  data: SaveData,
  levelId: string,
  stars: number,
  hp: number,
  tick?: number,
): SaveData {
  const prev = data.levels[levelId]
  const better = !prev || stars > prev.stars || (stars === prev.stars && hp > prev.bestHp)
  if (!better) return data
  const res: LevelResult = {
    stars: Math.max(stars, prev?.stars ?? 0),
    bestHp: Math.max(hp, prev?.bestHp ?? 0),
  }
  if (tick !== undefined) res.bestTick = tick
  return { ...data, levels: { ...data.levels, [levelId]: res } }
}
