import { expect, test } from '@playwright/test'
import { openBattle } from './helpers'

test('blur ставит бой на паузу: тик не растёт', async ({ page }) => {
  await openBattle(page, '?seed=1')
  // убеждаемся, что без паузы время идёт
  const t0 = await page.evaluate(() => window.__game!.state!.tick)
  await page.waitForFunction((t) => window.__game!.state!.tick > t, t0)

  await page.evaluate(() => window.dispatchEvent(new Event('blur')))
  await expect(page.getByTestId('pause-menu')).toBeVisible()

  const frozen = await page.evaluate(() => window.__game!.state!.tick)
  // окно наблюдения — 60 кадров rAF (без паузы за это время тик заведомо вырос бы), а не время
  await page.evaluate(
    () =>
      new Promise<void>((r) => {
        let n = 60
        const f = () => (--n > 0 ? requestAnimationFrame(f) : r())
        requestAnimationFrame(f)
      }),
  )
  expect(await page.evaluate(() => window.__game!.state!.tick)).toBe(frozen)
})
