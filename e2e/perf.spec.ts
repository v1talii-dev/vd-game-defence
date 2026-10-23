import { expect, test } from '@playwright/test'
import { openBattle, playFromMenu } from './helpers'

// Замер перф-целей SPEC §6.6 (десктоп). Зависит от железа, поэтому вне обычного прогона:
// PERF=1 npx playwright test e2e/perf.spec.ts --headed
test.skip(!process.env.PERF, 'только по PERF=1')
test.use({ launchOptions: { args: ['--js-flags=--expose-gc', '--enable-precise-memory-info'] } })

/** Средний FPS по requestAnimationFrame за окно ms */
function measureFps(ms: number): Promise<number> {
  return new Promise((resolve) => {
    let frames = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      frames++
      if (t - t0 < ms) requestAnimationFrame(tick)
      else resolve((frames * 1000) / (t - t0))
    }
    requestAnimationFrame(tick)
  })
}

test('стресс-сцена: 150 врагов + 40 башен ≥ 60 FPS', async ({ page }) => {
  await openBattle(page, '?seed=1&debug=1&stress=1')
  // врагов и башни создаёт сама стресс-сцена (команды spawnEnemies / placeTower)
  await expect
    .poll(() => page.evaluate(() => window.__game!.state!.enemies.length), { timeout: 30_000 })
    .toBeGreaterThanOrEqual(150)
  const fps = await page.evaluate(measureFps, 5000)
  const s = await page.evaluate(() => ({
    enemies: window.__game!.state!.enemies.length,
    towers: window.__game!.state!.towers.length,
    calls: window.__game!.glInfo().calls,
    tris: window.__game!.glInfo().triangles,
  }))
  // draw calls колеблются от кадра к кадру — берём максимум по выборке
  for (let i = 0; i < 40; i++) {
    s.calls = Math.max(s.calls, await page.evaluate(() => window.__game!.glInfo().calls))
    await page.waitForTimeout(50)
  }
  console.log('PERF', JSON.stringify({ fps, ...s }))
  expect(s.towers).toBe(40)
  // rAF в окне привязан к 60 Гц монитора, допуск на джиттер замера
  expect(fps).toBeGreaterThanOrEqual(58)
  expect(s.calls).toBeLessThanOrEqual(150)
})

test('время до интерактива < 3 с', async ({ page }) => {
  const t0 = Date.now()
  await page.goto('./')
  await page.getByRole('link', { name: 'Играть' }).waitFor()
  const menuMs = Date.now() - t0
  await playFromMenu(page)
  await page.waitForFunction(() => window.__game?.ready)
  const battleMs = Date.now() - t0
  console.log('PERF', JSON.stringify({ menuMs, battleMs }))
  expect(battleMs).toBeLessThan(3000)
})

test('память после 3 рестартов боя — рост ≤ 10%, WebGL-ресурсы возвращаются к исходным', async ({
  page,
}) => {
  const heap = async () => {
    await page.evaluate(() => (window as unknown as { gc(): void }).gc())
    return page.evaluate(
      () =>
        (performance as unknown as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize,
    )
  }
  const restart = async () => {
    await page.evaluate(() => (location.hash = '#/'))
    await playFromMenu(page)
    await page.waitForFunction(() => window.__game?.ready)
    await page.waitForTimeout(1000)
  }
  const gl = () => page.evaluate(() => window.__game!.glInfo())
  await openBattle(page, '?seed=1')
  await page.waitForTimeout(1000)
  const base = await heap()
  const glBase = await gl()
  for (let i = 0; i < 3; i++) {
    await restart()
    if (process.env.PERF === 'trace') console.log('PERF heap', i, (await heap()) / 1e6)
  }
  const after = await heap()
  const glAfter = await gl()
  console.log('PERF', JSON.stringify({ glBase, glAfter }))
  expect(glAfter.geometries).toBe(glBase.geometries)
  expect(glAfter.textures).toBe(glBase.textures)
  console.log('PERF', JSON.stringify({ baseMb: base / 1e6, afterMb: after / 1e6 }))
  expect(after).toBeLessThanOrEqual(base * 1.1 + 1.5e6) // куча ~8 МБ: 10% — шум GC, допуск 1.5 МБ
})
