import { afterEach, describe, expect, it, vi } from 'vitest'
import { createLogger, minLevel } from '.'

afterEach(() => vi.restoreAllMocks())

describe('logger', () => {
  it('prod: только warn и error', () => {
    const spies = (['debug', 'info', 'warn', 'error'] as const).map((l) =>
      vi.spyOn(console, l).mockImplementation(() => {}),
    )
    const log = createLogger('sim', minLevel(true))
    log.debug('a')
    log.info('b')
    log.warn('c')
    log.error('d')
    expect(spies.map((s) => s.mock.calls.length)).toEqual([0, 0, 1, 1])
    expect(spies[2]?.mock.calls[0]).toEqual(['[sim]', 'c'])
  })

  it('dev: выводятся все уровни', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    createLogger('input', minLevel(false)).debug('x')
    expect(spy).toHaveBeenCalledTimes(1)
  })
})
