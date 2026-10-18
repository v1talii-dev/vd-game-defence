import { describe, expect, it } from 'vitest'
import { parseDebugParams, readLocationParams } from './params'

describe('debug params', () => {
  it('разбирает числа и speed только 1|2|8', () => {
    expect(parseDebugParams('?seed=123&wave=8&money=9999&speed=8&debug=1')).toEqual({
      debug: true,
      seed: 123,
      wave: 8,
      money: 9999,
      speed: 8,
    })
    expect(parseDebugParams('speed=3&seed=abc&money=-5')).toEqual({
      debug: false,
      seed: undefined,
      wave: undefined,
      money: undefined,
      speed: undefined,
    })
  })

  it('читает параметры и из search, и из hash', () => {
    expect(readLocationParams({ search: '?seed=1', hash: '#/battle?wave=3' })).toMatchObject({
      seed: 1,
      wave: 3,
    })
  })
})
