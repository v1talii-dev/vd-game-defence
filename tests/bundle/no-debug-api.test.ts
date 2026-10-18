import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// dist должен быть от обычной `vite build` (mode production), не от `--mode test`
const assets = new URL('../../dist/assets/', import.meta.url)
const hasDist = existsSync(assets)

describe.skipIf(!hasDist)('prod-сборка', () => {
  it('window.__game не попадает в бандл', () => {
    const files = readdirSync(assets).filter((f) => f.endsWith('.js'))
    expect(files.length).toBeGreaterThan(0)
    const leaked = files.filter((f) => readFileSync(new URL(f, assets), 'utf8').includes('__game'))
    expect(leaked).toEqual([])
  })
})
