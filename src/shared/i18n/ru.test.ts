import { describe, expect, it } from 'vitest'
import { t } from '.'

describe('i18n', () => {
  it('has RU title', () => {
    expect(t.title).toBe('Рубеж обороны')
  })
})
