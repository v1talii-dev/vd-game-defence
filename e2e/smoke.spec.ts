import { expect, test } from '@playwright/test'

test('menu → play → canvas, no console errors', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

  await page.goto('./')
  await page.getByRole('link', { name: 'Играть' }).click()
  await expect(page.locator('[data-testid="battlefield"] canvas')).toBeVisible()
  expect(errors).toEqual([])
})
