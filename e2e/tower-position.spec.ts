import { expect, test } from '@playwright/test'
import { openBattle } from './helpers'

test('панель следует за выбранной башней и остаётся в окне', async ({ page }) => {
  await openBattle(page)
  const cells = await page.evaluate(() => {
    const cells = window.__game!.level.buildable
    return [
      cells.reduce((a, b) => (a.x < b.x ? a : b)),
      cells.reduce((a, b) => (a.x > b.x ? a : b)),
      cells.reduce((a, b) => (a.y < b.y ? a : b)),
      cells.reduce((a, b) => (a.y > b.y ? a : b)),
    ]
  })
  for (const cell of cells) {
    await page.evaluate((c) => {
      const g = window.__game!
      if (!g.state!.towers.some((t) => t.cell.x === c.x && t.cell.y === c.y)) {
        g.dispatch({ type: 'placeTower', towerType: 'machineGun', cell: c })
        g.step(100)
      }
      g.session.select(g.state!.towers.find((t) => t.cell.x === c.x && t.cell.y === c.y)!.id)
      g.setCamera({ x: c.x, y: c.y, zoom: 15 })
    }, cell)
    const panel = page.getByTestId('tower-panel')
    await expect(panel).toBeVisible()
    await expect
      .poll(async () => {
        const box = await panel.boundingBox()
        const point = await page.evaluate((c) => window.__game!.cellToScreen(c.x, c.y), cell)
        if (!box) return false
        return (
          box.x >= 0 &&
          box.y >= 0 &&
          box.x + box.width <= 1280 &&
          box.y + box.height <= 720 &&
          (box.x > point.x || box.x + box.width < point.x)
        )
      })
      .toBe(true)
    const before = await panel.boundingBox()
    await page.evaluate((c) => window.__game!.setCamera({ x: c.x + 2, y: c.y + 2, zoom: 12 }), cell)
    await expect
      .poll(async () => {
        const after = await panel.boundingBox()
        return before && after ? Math.hypot(after.x - before.x, after.y - before.y) : 0
      })
      .toBeGreaterThan(1)
  }
})
