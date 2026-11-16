import { expect, test } from '@playwright/test'
import { openBattle } from './helpers'

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`переходы UI: ${reducedMotion}, быстрый возврат и клавиатурный фокус`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.emulateMedia({ reducedMotion })
    await page.goto('./#/campaign')
    const card = page.getByTestId('level-card-desert-base')
    const briefing = page.getByTestId('level-briefing-screen')
    for (let i = 0; i < 3; i++) {
      await card.click()
      await expect(briefing).toBeVisible()
      // Кнопка вне анимируемого блока закрывает его ещё во время появления.
      await page.getByTestId('level-back').click()
      await card.click()
      await expect(briefing).toHaveCount(1)
      await page.getByTestId('level-back').click()
      await expect(briefing).toHaveCount(0)
    }
    await card.click()
    const start = page.getByTestId('level-start')
    await start.focus()
    await expect(briefing).toHaveCSS('transform', 'none')
    await expect(briefing).toHaveCSS('opacity', '1')
    await expect(start).toBeFocused()
    await page.keyboard.press('Enter')
    await page.waitForFunction(() => window.__game?.ready)
    expect(errors).toEqual([])
  })
}

test('быстрое закрытие панели не блокирует повторный выбор и клавиши', async ({ page }) => {
  await openBattle(page, '?seed=1&money=9999')
  const id = await page.evaluate(() => {
    const g = window.__game!
    g.setSpeed(0 as 1)
    g.dispatch({ type: 'placeTower', towerType: 'machineGun', cell: g.level.buildable[0] })
    g.step(120)
    return g.state!.towers[0]!.id
  })
  const panel = page.getByTestId('tower-panel')
  for (let i = 0; i < 3; i++) {
    await page.evaluate((towerId) => window.__game!.session.select(towerId), id)
    await expect(panel).toBeVisible()
    await page.evaluate(() => window.__game!.session.select(null))
    await page.evaluate((towerId) => window.__game!.session.select(towerId), id)
    await expect(panel).toHaveCount(1)
  }
  await expect(page.getByTestId('tower-upgrade')).toBeEnabled()
  await page.keyboard.press('KeyU')
  await page.evaluate(() => window.__game!.step(1))
  await expect
    .poll(() => page.evaluate(() => window.__game!.state!.towers[0]!.phase))
    .toBe('upgrading')
  await page.keyboard.press('KeyU')
  await page.evaluate(() => window.__game!.step(1))
  await expect
    .poll(() => page.evaluate(() => window.__game!.state!.towers[0]!.phase))
    .toBe('active')
  await page.keyboard.press('KeyX')
  await page.evaluate(() => window.__game!.step(1))
  await expect.poll(() => page.evaluate(() => window.__game!.state!.towers.length)).toBe(0)
  await expect(panel).toHaveCount(0)
  await page.getByTestId('build-machineGun').click()
  await expect.poll(() => page.evaluate(() => window.__game!.session.buildType)).toBe('machineGun')
})
