import { describe, expect, it } from 'vitest'
import { createEmitter, hashState, nextRandom, seedRng } from '.'

describe('rng', () => {
  it('одинаковый seed — одинаковая последовательность в [0, 1)', () => {
    const run = (seed: number) => {
      let s = seedRng(seed)
      const out: number[] = []
      for (let i = 0; i < 100; i++) {
        const [v, next] = nextRandom(s)
        out.push(v)
        s = next
      }
      return out
    }
    const a = run(42)
    expect(run(42)).toEqual(a)
    expect(run(43)).not.toEqual(a)
    expect(a.every((v) => v >= 0 && v < 1)).toBe(true)
  })
})

describe('emitter', () => {
  it('доставляет события по типу и отписывает', () => {
    type E = { type: 'a'; n: number } | { type: 'b' }
    const em = createEmitter<E>()
    const got: number[] = []
    const off = em.on('a', (e) => got.push(e.n))
    em.emit({ type: 'a', n: 1 })
    em.emit({ type: 'b' })
    off()
    em.emit({ type: 'a', n: 2 })
    expect(got).toEqual([1])
  })
})

describe('hashState', () => {
  it('не зависит от порядка ключей и чувствителен к значениям', () => {
    expect(hashState({ a: 1, b: [1, { c: 2 }] })).toBe(hashState({ b: [1, { c: 2 }], a: 1 }))
    expect(hashState({ a: 1 })).not.toBe(hashState({ a: 2 }))
    expect(hashState({ a: 1, u: undefined })).toBe(hashState({ a: 1 }))
  })
})
