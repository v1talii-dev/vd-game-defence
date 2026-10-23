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

test('stub-2 открывается на той же карте', async ({ page }) => {
  await openBattle(page)
  await page.goto('./#/battle/stub-2')
  await page.waitForFunction(() => !!window.__game?.state && window.__game.ready)
  await expect(page.getByTestId('battlefield')).toBeVisible()
})

test('неизвестный id уводит в меню без падения', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('./#/battle/нет-такого')
  await expect(page).toHaveURL(/#\/$/)
  expect(errors).toEqual([])
})
