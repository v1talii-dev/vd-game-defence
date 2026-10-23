import { describe, expect, it } from 'vitest'
import { HOTKEYS, matches } from './hotkeys'

describe('hotkeys', () => {
  it('коды не повторяются между действиями', () => {
    const all = Object.values(HOTKEYS).flatMap((h) => h.codes)
    expect(new Set(all).size).toBe(all.length)
  })
  it('matches', () => {
    expect(matches('sell', 'Delete')).toBe(true)
    expect(matches('sell', 'KeyS')).toBe(false)
  })
})
