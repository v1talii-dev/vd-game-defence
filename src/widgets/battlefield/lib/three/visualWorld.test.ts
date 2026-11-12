import { beforeEach, expect, it, vi } from 'vitest'
import { QUALITY_PROFILES } from '@/shared/lib/three'

const mocks = vi.hoisted(() => ({
  init: vi.fn<() => Promise<void>>(),
  world: vi.fn(),
  free: vi.fn(),
}))
vi.mock('@dimforge/rapier3d-compat', () => ({
  init: mocks.init,
  World: class {
    constructor(gravity: unknown) {
      mocks.world(gravity)
    }
    free() {
      mocks.free()
    }
  },
}))
beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
})

it('low never initializes Rapier; late initialization cannot attach a disposed world', async () => {
  let finish!: () => void
  mocks.init.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve
      }),
  )
  const { createVisualWorld } = await import('./visualWorld')
  const low = createVisualWorld(QUALITY_PROFILES.low)
  await low.ready
  expect(mocks.init).not.toHaveBeenCalled()
  expect(low.isReady()).toBe(false)
  low.dispose()
  const late = createVisualWorld(QUALITY_PROFILES.high)
  await vi.waitFor(() => expect(mocks.init).toHaveBeenCalledTimes(1))
  late.dispose()
  finish()
  await late.ready
  expect(mocks.world).not.toHaveBeenCalled()
  expect(late.isReady()).toBe(false)
  const live = createVisualWorld(QUALITY_PROFILES.high)
  await live.ready
  expect(live.isReady()).toBe(true)
  expect(mocks.init).toHaveBeenCalledTimes(1)
  expect(mocks.world).toHaveBeenCalledWith({ x: 0, y: -9.81, z: 0 })
  live.dispose()
  live.dispose()
  expect(mocks.free).toHaveBeenCalledTimes(1)
  expect(live.isReady()).toBe(false)
})

it('propagates WASM initialization errors instead of silently disabling high', async () => {
  mocks.init.mockRejectedValue(new Error('WASM init failed'))
  const { createVisualWorld } = await import('./visualWorld')
  const high = createVisualWorld(QUALITY_PROFILES.high)
  await expect(high.ready).rejects.toThrow('WASM init failed')
  expect(high.isReady()).toBe(false)
  expect(mocks.world).not.toHaveBeenCalled()
  high.dispose()
})
