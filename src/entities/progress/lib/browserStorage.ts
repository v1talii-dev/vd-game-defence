import type { StorageLike } from '../model/save'

/** Реальный localStorage или null, если он недоступен (приватный режим, запрет). */
export function getBrowserStorage(): StorageLike | null {
  try {
    const s = window.localStorage
    const k = 'vdgd:probe'
    s.setItem(k, '1')
    s.removeItem(k)
    return s
  } catch {
    return null
  }
}
