import { expect, test } from '@playwright/test'
import { pickBuildable, snapshot } from './helpers'

// ввод 3D: постройка кликом, выбор по телу башни, Q/E, пан/зум
test('r3d: постройка, выбор башни, камера', async ({ page }, info) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'vdgd:save:v1',
      JSON.stringify({
        version: 1,
        levels: {},
        settings: { volume: 0.7, sfx: true, showRanges: false },
        tutorialDone: true,
      }),
    )
  })
  await page.goto('./#/battle')
  await page.waitForFunction(() => !!window.__game?.state && window.__game.ready)
  const shot = (n: string) => page.screenshot({ path: info.outputPath(`${n}.png`) })
  const cell = await pickBuildable(page, 3)
  const at = () => page.evaluate((c) => window.__game!.cellToScreen(c.x, c.y), cell)

  await page.keyboard.press('Digit1')
  let p = await at()
  await page.mouse.move(p.x, p.y)
  await shot('1-ghost')
  const before = await snapshot(page)
  await page.mouse.click(p.x, p.y)
  await expect.poll(async () => (await snapshot(page)).towers).toBe(before.towers + 1)

  // клик по телу башни выше основания (камера повёрнута)
  await page.keyboard.press('Escape')
  await page.keyboard.press('KeyE')
  await page.waitForTimeout(600)
  p = await at()
  await page.mouse.click(p.x, p.y - 6)
  await expect
    .poll(() => page.evaluate(() => window.__game!.session.selectedTowerId))
    .not.toBeNull()
  await shot('2-selected')

  // пан и зум
  await page.mouse.move(p.x + 200, p.y + 100)
  await page.mouse.wheel(0, -300)
  await page.mouse.move(p.x + 200, p.y + 100)
  await page.mouse.down()
  await page.mouse.move(p.x + 80, p.y + 40, { steps: 5 })
  await page.mouse.up()
  const moved = await at()
  expect(Math.hypot(moved.x - p.x, moved.y - p.y)).toBeGreaterThan(30)
  await shot('3-pan-zoom')
})
