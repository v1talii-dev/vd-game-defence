import { afterEach, describe, expect, it, vi } from 'vitest'
import { defaultSave, loadSave, withResult, writeSave, type StorageLike } from './save'

const mem = (init?: string): StorageLike & { v: string | null } => ({
  v: init ?? null,
  getItem() {
    return this.v
  },
  setItem(_k, value) {
    this.v = value
  },
})

afterEach(() => vi.restoreAllMocks())

describe('progress save', () => {
  it('пустое хранилище даёт дефолт', () => {
    const r = loadSave(mem())
    expect(r.data).toEqual(defaultSave())
    expect(r.storageAvailable).toBe(true)
  })

  it('битый JSON даёт дефолт и предупреждение', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(loadSave(mem('{oops')).data).toEqual(defaultSave())
    expect(warn).toHaveBeenCalled()
  })

  it('неизвестная версия даёт дефолт', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(loadSave(mem(JSON.stringify({ version: 99, levels: {} }))).data).toEqual(defaultSave())
    expect(warn).toHaveBeenCalled()
  })

  it('недоступное хранилище', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(loadSave(null).storageAvailable).toBe(false)
    const bad: StorageLike = {
      getItem() {
        throw new Error('denied')
      },
      setItem() {
        throw new Error('denied')
      },
    }
    expect(loadSave(bad).storageAvailable).toBe(false)
    expect(writeSave(bad, defaultSave())).toBe(false)
  })

  it('запись и чтение; мусорные поля заменяются дефолтом', () => {
    const s = mem()
    writeSave(s, withResult(defaultSave(), 'a', 2, 12))
    expect(JSON.parse(s.v!).version).toBe(2)
    expect(loadSave(s).data.levels.a).toEqual({ stars: 2, bestHp: 12 })
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const bad = JSON.stringify({ version: 2, levels: { x: 'bad' }, settings: { volume: 'loud' } })
    expect(loadSave(mem(bad)).data).toEqual(defaultSave())
  })

  it('recordResult хранит лучший результат', () => {
    let d = withResult(defaultSave(), 'a', 2, 12)
    d = withResult(d, 'a', 1, 20)
    expect(d.levels.a).toEqual({ stars: 2, bestHp: 12 })
    d = withResult(d, 'a', 2, 15)
    expect(d.levels.a).toEqual({ stars: 2, bestHp: 15 })
    d = withResult(d, 'a', 3, 18)
    expect(d.levels.a?.stars).toBe(3)
  })
})

describe('миграция v1 → v2', () => {
  // реальный снимок v1 из игры
  const v1 = JSON.stringify({
    version: 1,
    levels: { 'desert-base': { stars: 2, bestHp: 14 } },
    settings: { volume: 0.3, sfx: false, showRanges: true },
    tutorialDone: true,
    helpHintSeen: true,
  })
  const multi = (init: Record<string, string>): StorageLike & { m: Record<string, string> } => ({
    m: init,
    getItem(k) {
      return this.m[k] ?? null
    },
    setItem(k, v) {
      this.m[k] = v
    },
  })

  it('переносит все поля, пишет v2, не трогает v1', () => {
    const s = multi({ 'vdgd:save:v1': v1 })
    const d = loadSave(s).data
    expect(d.version).toBe(2)
    expect(d.levels['desert-base']).toEqual({ stars: 2, bestHp: 14 })
    expect(d.settings).toEqual({ volume: 0.3, sfx: false, showRanges: true })
    expect(d.tutorialDone && d.helpHintSeen).toBe(true)
    expect(JSON.parse(s.m['vdgd:save:v2']!)).toEqual(d)
    expect(s.m['vdgd:save:v1']).toBe(v1)
  })

  it('v2 приоритетнее v1; битый v1 даёт дефолт', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const v2 = JSON.stringify({ ...defaultSave(), tutorialDone: true })
    expect(loadSave(multi({ 'vdgd:save:v1': v1, 'vdgd:save:v2': v2 })).data.levels).toEqual({})
    expect(loadSave(multi({ 'vdgd:save:v1': '{x' })).data).toEqual(defaultSave())
  })

  it('звёзды и bestHp не уменьшаются, bestTick сохраняется', () => {
    let d = withResult(defaultSave(), 'a', 3, 10, 500)
    d = withResult(d, 'a', 1, 20, 100)
    expect(d.levels.a).toEqual({ stars: 3, bestHp: 10, bestTick: 500 })
    d = withResult(withResult(defaultSave(), 'b', 1, 20), 'b', 2, 5)
    expect(d.levels.b).toEqual({ stars: 2, bestHp: 20 })
  })
})
