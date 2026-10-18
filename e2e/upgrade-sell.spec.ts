import { expect, test } from '@playwright/test'
import { cellClient, openBattle, pickBuildable } from './helpers'

test('улучшение и продажа через панель башни', async ({ page, isMobile }) => {
  await openBattle(page, '?seed=1')
  const cell = await pickBuildable(page)
  await page.evaluate((c) => {
    const g = window.__game!
    g.dispatch({ type: 'placeTower', towerType: 'machineGun', cell: c })
    g.step(1)
  }, cell)
  await expect.poll(() => page.evaluate(() => window.__game!.state!.towers.length)).toBe(1)

  // выбираем кликом (на таче — тапом) по клетке башни
  const pt = await cellClient(page, cell)
  if (isMobile) await page.touchscreen.tap(pt.x, pt.y)
  else await page.mouse.click(pt.x, pt.y)
  await expect(page.getByTestId('tower-panel')).toBeVisible()
  await expect(page.getByTestId('tower-level')).toHaveText('Уровень 1')

  const moneyBefore = await page.evaluate(() => window.__game!.state!.money)
  await page.getByTestId('tower-upgrade').click()
  await expect(page.getByTestId('tower-level')).toHaveText('Уровень 2')
  const afterUpgrade = await page.evaluate(() => {
    const s = window.__game!.state!
    return { money: s.money, invested: s.towers[0]!.invested }
  })
  expect(afterUpgrade.money).toBeLessThan(moneyBefore)

  await page.getByTestId('tower-sell').click()
  await expect(page.getByTestId('tower-panel')).toBeHidden()
  const final = await page.evaluate(() => {
    const s = window.__game!.state!
    return { money: s.money, towers: s.towers.length }
  })
  expect(final.towers).toBe(0)
  // возврат 70% вложенного (SPEC), округление вниз
  expect(final.money - afterUpgrade.money).toBe(Math.floor(afterUpgrade.invested * 0.7))
})
