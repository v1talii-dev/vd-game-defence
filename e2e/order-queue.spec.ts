import { expect, test } from '@playwright/test'
import { openBattle } from './helpers'

test('панель очереди: порядок заказов, оплата и отмена', async ({ page }) => {
  await openBattle(page, '?seed=1')
  await expect(page.getByTestId('order-queue')).toBeHidden()

  // тратим деньги до двух неоплаченных заказов постройки, затем заказываем улучшение
  const ids = await page.evaluate(() => {
    const g = window.__game!
    const cells = g.level.buildable
    const queued = () => g.state!.towers.filter((t) => t.phase === 'queued').length
    let i = 0
    g.dispatch({ type: 'placeTower', towerType: 'machineGun', cell: cells[i++] })
    g.step(120)
    const first = g.state!.towers[0]!.id
    for (; i < cells.length && queued() < 2; i++) {
      g.dispatch({ type: 'placeTower', towerType: 'rocket', cell: cells[i] })
      g.step(1)
    }
    g.dispatch({ type: 'upgradeTower', towerId: first })
    g.step(1)
    return g.state!.towers.map((t) => t.id)
  })
  const rows = page.locator('[data-testid^="order-build-"], [data-testid^="order-upgrade-"]')
  const queuedBuilds = await page.evaluate(() =>
    window.__game!.state!.towers.filter((t) => t.phase === 'queued').map((t) => t.id),
  )
  const waiting = page.locator('[data-status="waiting"]')
  await expect(waiting).toHaveCount(queuedBuilds.length + 1)
  // порядок FIFO: две постройки (по id), затем улучшение
  const order = await rows.evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')))
  expect(order.at(-1)).toBe(`order-upgrade-${ids[0]}`)

  // деньги -> первая строка «строится»
  await page.evaluate(() => {
    const g = window.__game!
    g.dispatch({ type: 'grantMoney', amount: 20_000 })
    g.step(2)
  })
  await expect(page.locator('[data-status="working"]').first()).toBeVisible()

  // клик по строке выбирает башню
  await page.locator('[data-testid="order-select"]').first().click()
  await expect(page.getByTestId('tower-panel')).toBeVisible()

  // отмена крестиком убирает строку
  const before = await rows.count()
  await page.getByTestId('order-cancel').first().click()
  await expect(rows).toHaveCount(before - 1)
})
