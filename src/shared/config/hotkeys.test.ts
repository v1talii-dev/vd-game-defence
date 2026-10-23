import { describe, expect, it } from 'vitest'
import { HOTKEYS, HOTKEY_GROUPS, buildSlotIndex, matches } from './hotkeys'

describe('hotkeys', () => {
  it('коды не повторяются между действиями', () => {
    const all = Object.values(HOTKEYS).flatMap((h) => h.codes)
    expect(new Set(all).size).toBe(all.length)
  })
  it('matches', () => {
    expect(matches('sell', 'Delete')).toBe(true)
    expect(matches('sell', 'KeyS')).toBe(false)
  })
  it('каждое действие попадает в справку ровно один раз', () => {
    const all: string[] = Object.values(HOTKEY_GROUPS).flat()
    expect([...all].sort()).toEqual(Object.keys(HOTKEYS).sort())
  })
  it('buildSlotIndex', () => {
    expect(buildSlotIndex('Digit1')).toBe(0)
    expect(buildSlotIndex('Digit9')).toBe(8)
    expect(buildSlotIndex('Digit0')).toBeNull()
  })
})
