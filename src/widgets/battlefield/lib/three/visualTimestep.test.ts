import { expect, it, vi } from 'vitest'
import { createVisualTimestep } from './visualTimestep'

it('limits overloaded frames and discards whole-step debt', () => {
  const advance = createVisualTimestep()
  const step = vi.fn()
  advance(8 / 60, step)
  expect(step).toHaveBeenCalledTimes(4)
  advance(0, step)
  expect(step).toHaveBeenCalledTimes(4)
  advance(1 / 60, step)
  expect(step).toHaveBeenCalledTimes(5)
})
