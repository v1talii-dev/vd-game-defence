import { expect, test } from '@playwright/test'
import { openBattle } from './helpers'

test('потеря WebGL-контекста: сообщение, затем восстановление без ошибок', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await openBattle(page, '?seed=1')
  await page.evaluate(() => {
    const gl = document.querySelector('canvas')!.getContext('webgl2')!
    const ext = gl.getExtension('WEBGL_lose_context')!
    Object.assign(window, { __ext: ext })
    ext.loseContext()
  })
  await expect(page.getByTestId('gl-lost')).toBeVisible()
  await page.evaluate(() =>
    (window as unknown as { __ext: { restoreContext(): void } }).__ext.restoreContext(),
  )
  await expect(page.getByTestId('gl-lost')).toHaveCount(0)
  const tick0 = await page.evaluate(() => window.__game!.state!.tick)
  await expect.poll(() => page.evaluate(() => window.__game!.state!.tick)).toBeGreaterThan(tick0)
  expect(errors).toEqual([])
})
