import { expect, test } from '@playwright/test'
import { cellClient, openBattle, pickBuildable, snapshot } from './helpers'

// постройка кликом при любом повороте камеры: cellToScreen должен попадать в нужную клетку
for (const yaw of [0, 90, 180, 270]) {
  test(`постройка при yaw=${yaw}`, async ({ page }) => {
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

// пан должен работать на стартовом кадре (карта заполняет экран, но запас пана есть)
test('стартовый кадр: drag мышью и WASD двигают камеру', async ({ page }) => {
  await openBattle(page, '?seed=1')
  const at = () => page.evaluate(() => window.__game!.cellToScreen(12, 7))
  await page.waitForTimeout(300)
  const p0 = await at()
  await page.mouse.move(p0.x + 150, p0.y + 100)
  await page.mouse.down()
  await page.mouse.move(p0.x + 50, p0.y + 40, { steps: 5 })
  await page.mouse.up()
  const p1 = await at()
  expect(Math.hypot(p1.x - p0.x, p1.y - p0.y)).toBeGreaterThan(30)
  await page.keyboard.down('KeyD')
  await page.waitForTimeout(400)
  await page.keyboard.up('KeyD')
  const p2 = await at()
  expect(Math.hypot(p2.x - p1.x, p2.y - p1.y)).toBeGreaterThan(20)
})
