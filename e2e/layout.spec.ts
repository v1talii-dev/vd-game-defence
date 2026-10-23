import { expect, test } from '@playwright/test'
import { cellClient, openBattle, pickBuildable } from './helpers'

const sizes = [
  { w: 1280, h: 720 },
  { w: 1920, h: 1080 },
  { w: 1024, h: 600 },
]

for (const { w, h } of sizes) {
  test(`UI не закрывает центр поля ${w}x${h}`, async ({ page }, info) => {
    await page.setViewportSize({ width: w, height: h })
    await openBattle(page, '?seed=1')
    const cell = await pickBuildable(page)
    await page.evaluate((c) => {
      const g = window.__game!
      g.dispatch({ type: 'placeTower', towerType: 'machineGun', cell: c })
      g.step(120)
    }, cell)
    const pt = await cellClient(page, cell)
    await page.mouse.click(pt.x, pt.y)
    await expect(page.getByTestId('tower-panel')).toBeVisible()
    await page.screenshot({ path: info.outputPath(`battle-${w}x${h}.png`) })

    // центральная область (между полосами и правой панелью) принадлежит канвасу
    const hits = await page.evaluate(
      ([vw, vh]) => {
        const pts = [
          [0.5, 0.5],
          [0.3, 0.5],
          [0.5, 0.3],
          [0.5, 0.7],
        ] as const
        return pts.map(([fx, fy]) => {
          const el = document.elementFromPoint(vw! * fx, vh! * fy)
          return el?.tagName === 'CANVAS'
        })
      },
      [w, h],
    )
    expect(hits).toEqual([true, true, true, true])
  })
}
