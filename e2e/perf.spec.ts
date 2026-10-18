import { expect, test } from '@playwright/test'
import { openBattle } from './helpers'

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
  await page.evaluate(() => window.__game!.setSpeed(2))
  // ждём, пока волны досыплют врагов до цели стресс-сцены
  await expect
    .poll(() => page.evaluate(() => window.__game!.state!.enemies.length), { timeout: 60_000 })
    .toBeGreaterThanOrEqual(150)
  const fps = await page.evaluate(measureFps, 5000)
  const s = await page.evaluate(() => ({
    enemies: window.__game!.state!.enemies.length,
    towers: window.__game!.state!.towers.length,
  }))
  console.log('PERF', JSON.stringify({ fps, ...s }))
  expect(s.towers).toBe(40)
  expect(fps).toBeGreaterThanOrEqual(60)
})

test('время до интерактива < 3 с', async ({ page }) => {
  const t0 = Date.now()
  await page.goto('./')
  await page.getByRole('link', { name: 'Играть' }).waitFor()
  const menuMs = Date.now() - t0
  await page.getByRole('link', { name: 'Играть' }).click()
  await page.waitForFunction(() => window.__game?.ready)
  const battleMs = Date.now() - t0
  console.log('PERF', JSON.stringify({ menuMs, battleMs }))
  expect(battleMs).toBeLessThan(3000)
})

test('память после 3 рестартов боя — рост ≤ 10%', async ({ page }) => {
  const heap = async () => {
    await page.evaluate(() => (window as unknown as { gc(): void }).gc())
    return page.evaluate(
      () => (performance as unknown as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize,
    )
  }
  const restart = async () => {
    await page.evaluate(() => (location.hash = '#/'))
    await page.getByRole('link', { name: 'Играть' }).click()
    await page.waitForFunction(() => window.__game?.ready)
    await page.waitForTimeout(1000)
  }
  await openBattle(page, '?seed=1')
  await page.waitForTimeout(1000)
  const base = await heap()
  for (let i = 0; i < 3; i++) {
    await restart()
    if (process.env.PERF === 'trace') console.log('PERF heap', i, (await heap()) / 1e6)
  }
  const after = await heap()
  console.log('PERF', JSON.stringify({ baseMb: base / 1e6, afterMb: after / 1e6 }))
  expect(after).toBeLessThanOrEqual(base * 1.1)
})
