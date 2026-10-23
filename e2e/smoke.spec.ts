import { expect, test } from '@playwright/test'
import { playFromMenu } from './helpers'

test('menu → play → canvas, no console errors', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

  await page.goto('./')
  await playFromMenu(page)
  // сцена грузит GLB: ждём готовности боя, а не 5 с expect по умолчанию
  await page.waitForFunction(() => !!window.__game?.ready)
  await expect(page.locator('[data-testid="battlefield"] canvas')).toBeVisible()
  expect(errors).toEqual([])
})
