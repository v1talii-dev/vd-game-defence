import { expect, test } from '@playwright/test'
import { cellClient, openBattle, pickBlocked, pickBuildable, snapshot } from './helpers'

test.describe('постройка башни', () => {
  test.skip(({ isMobile }) => isMobile, 'на таче постройка идёт через «Построить» (mobile.spec)')

  test('клавиша 1 + клик по buildable-клетке: кредиты уменьшились, башня в state', async ({
    page,
  }) => {
    await openBattle(page, '?seed=1')
    const before = await snapshot(page)
    const cell = await pickBuildable(page)

    await page.keyboard.press('1')
    await expect(page.getByTestId('build-machineGun')).toHaveAttribute('aria-pressed', 'true')
    const pt = await cellClient(page, cell)
    await page.mouse.click(pt.x, pt.y)

    // команда применяется на следующем тике симуляции
    await expect.poll(async () => (await snapshot(page)).towers).toBe(1)
    const after = await snapshot(page)
    expect(after.money).toBeLessThan(before.money)
    const tower = await page.evaluate(() => window.__game!.state!.towers[0]!)
    expect(tower.cell).toEqual(cell)
  })

  test('кнопка меню выбирает башню', async ({ page }) => {
    await openBattle(page, '?seed=1')
    await page.getByTestId('build-rocket').click()
    await expect(page.getByTestId('build-rocket')).toHaveAttribute('aria-pressed', 'true')
    expect(await page.evaluate(() => window.__game!.session.buildType)).toBe('rocket')
  })

  test('небилдабельная клетка: отказ, башни нет', async ({ page }) => {
    await openBattle(page, '?seed=1')
    const before = await snapshot(page)
    const cell = await pickBlocked(page)

    await page.keyboard.press('1')
    // клик только после того, как выбор башни дошёл до сессии
    await page.waitForFunction(() => window.__game!.session.buildType === 'machineGun')
    const pt = await cellClient(page, cell)
    await page.mouse.click(pt.x, pt.y)

    // симуляция отвергает команду, HUD показывает причину
    await expect(page.getByText('Сюда строить нельзя')).toBeVisible()
    const after = await snapshot(page)
    expect(after.towers).toBe(0)
    expect(after.money).toBe(before.money)
  })
})
