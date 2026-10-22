import { expect, test } from '@playwright/test'
import { openBattle } from './helpers'

test('blur ставит бой на паузу: тик не растёт', async ({ page }) => {
  await openBattle(page, '?seed=1')
  // убеждаемся, что без паузы время идёт
  const t0 = await page.evaluate(() => window.__game!.state!.tick)
  await expect.poll(() => page.evaluate(() => window.__game!.state!.tick)).toBeGreaterThan(t0)

  await page.evaluate(() => window.dispatchEvent(new Event('blur')))
  await expect(page.getByTestId('pause-menu')).toBeVisible()

  const frozen = await page.evaluate(() => window.__game!.state!.tick)
  // окно наблюдения 1 с (в тике кадр = 33 мс, значит прошло бы ~30 тиков)
  await page.evaluate(() => new Promise((r) => setTimeout(r, 1000)))
  expect(await page.evaluate(() => window.__game!.state!.tick)).toBe(frozen)
})
