import { expect, test } from '@playwright/test'
import { cellClient, openBattle, pickBuildable } from './helpers'

test('улучшение и продажа через панель башни', async ({ page, isMobile }) => {
  await openBattle(page, '?seed=1')
  const cell = await pickBuildable(page)
  await page.evaluate((c) => {
    const g = window.__game!
    g.dispatch({ type: 'placeTower', towerType: 'machineGun', cell: c })
    g.step(120) // стройка до 3 с
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
  await page.evaluate(() => window.__game!.step(1))
  await expect(page.getByTestId('tower-progress')).toBeVisible()
  await expect(page.getByTestId('tower-sell')).toBeDisabled()
  await page.evaluate(() => window.__game!.step(200)) // улучшение до 5 с
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

test('отмена улучшения возвращает деньги', async ({ page, isMobile }) => {
  await openBattle(page, '?seed=1')
  const cell = await pickBuildable(page)
  await page.evaluate((c) => {
    const g = window.__game!
    g.dispatch({ type: 'placeTower', towerType: 'machineGun', cell: c })
    g.step(120)
  }, cell)
  const pt = await cellClient(page, cell)
  if (isMobile) await page.touchscreen.tap(pt.x, pt.y)
  else await page.mouse.click(pt.x, pt.y)
  await expect(page.getByTestId('tower-panel')).toBeVisible()
  const before = await page.evaluate(() => window.__game!.state!.money)
  await page.getByTestId('tower-upgrade').click()
  await page.evaluate(() => window.__game!.step(10))
  await expect(page.getByTestId('tower-cancel')).toBeVisible()
  expect(await page.evaluate(() => window.__game!.state!.money)).toBeLessThan(before)
  await page.getByTestId('tower-cancel').click()
  await page.evaluate(() => window.__game!.step(1))
  await expect(page.getByTestId('tower-upgrade')).toBeVisible()
  expect(await page.evaluate(() => window.__game!.state!.money)).toBe(before)
})

test('заказ без денег: очередь, оплата при появлении денег, стройка, завершение', async ({
  page,
}) => {
  await openBattle(page, '?seed=1')
  // тратим деньги: строим, пока заказ не уйдёт в очередь
  const queued = await page.evaluate(() => {
    const g = window.__game!
    const cells = g.level.buildable
    for (let i = 0; i < cells.length && !g.state!.towers.some((t) => t.phase === 'queued'); i++) {
      g.dispatch({ type: 'placeTower', towerType: 'rocket', cell: cells[i] })
      g.step(1)
    }
    return g.state!.towers.find((t) => t.phase === 'queued')?.id ?? null
  })
  expect(queued).not.toBeNull()
  await expect(page.getByText('Заказ в очереди: ждёт кредитов')).toBeVisible()

  await page.evaluate(() => {
    const g = window.__game!
    g.dispatch({ type: 'grantMoney', amount: 5000 })
    g.step(2)
  })
  const phase = (id: number) =>
    page.evaluate((i) => window.__game!.state!.towers.find((t) => t.id === i)!.phase, id)
  expect(await phase(queued!)).toBe('building')
  await page.evaluate(() => window.__game!.step(120))
  expect(await phase(queued!)).toBe('active')
})
