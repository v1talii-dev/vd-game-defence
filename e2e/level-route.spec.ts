import { expect, test } from '@playwright/test'
import { openBattle } from './helpers'

test('#/battle/desert-base открывает бой с HP штаба из конфига', async ({ page }) => {
  await openBattle(page)
  await page.goto('./#/battle/desert-base')
  await page.waitForFunction(() => !!window.__game?.state && window.__game.ready)
  await expect(page.getByTestId('hud-hp')).toContainText('20/20')
})

test('старый #/battle ведёт на desert-base', async ({ page }) => {
  await openBattle(page)
  expect(page.url()).toContain('#/battle/desert-base')
})

test('закрытый stub-2 уводит на экран кампании', async ({ page }) => {
  await openBattle(page)
  await page.goto('./#/battle/stub-2')
  await expect(page).toHaveURL(/#\/campaign/)
})

test('неизвестный id уводит на кампанию без падения', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('./#/battle/нет-такого')
  await expect(page).toHaveURL(/#\/campaign/)
  expect(errors).toEqual([])
})
