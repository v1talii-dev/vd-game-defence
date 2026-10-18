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
    expect(JSON.parse(s.v!).version).toBe(1)
    expect(loadSave(s).data.levels.a).toEqual({ stars: 2, bestHp: 12 })
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const bad = JSON.stringify({ version: 1, levels: { x: 'bad' }, settings: { volume: 'loud' } })
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
