import { expect, test } from '@playwright/test'
import { cellClient, openBattle, pickBuildable, snapshot } from './helpers'

// постройка кликом при любом повороте камеры: cellToScreen должен попадать в нужную клетку
for (const yaw of [0, 90, 180, 270]) {
  test(`r3d: постройка при yaw=${yaw}`, async ({ page }) => {
    await openBattle(page, '?seed=1')
    await page.evaluate((a) => window.__game!.setCamera({ yaw: a }), yaw)
    const cell = await pickBuildable(page, 3)
    await page.keyboard.press('Digit1')
    const pt = await cellClient(page, cell)
    await page.mouse.click(pt.x, pt.y)
    await expect.poll(async () => (await snapshot(page)).towers).toBe(1)
    const tower = await page.evaluate(() => window.__game!.state!.towers[0]!)
    expect(tower.cell).toEqual(cell)
  })
}
