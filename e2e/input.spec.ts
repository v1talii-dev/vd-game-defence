import { expect, test } from '@playwright/test'
import { pickBuildable, snapshot } from './helpers'

// ввод 3D: постройка кликом, выбор по телу башни, Q/E не вращают, U улучшает, пан/зум
test('постройка, выбор башни, камера', async ({ page }, info) => {
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

  await shot('4-building')

  // Q/E не поворачивают камеру: проекция клетки не меняется
  await page.keyboard.press('Escape')
  const still = await at()
  await page.keyboard.press('KeyQ')
  await page.keyboard.press('KeyE')
  await page.waitForTimeout(600)
  p = await at()
  expect(Math.hypot(p.x - still.x, p.y - still.y)).toBeLessThan(1)
  // клик по телу башни выше основания
  await page.mouse.click(p.x, p.y - 6)
  await expect
    .poll(() => page.evaluate(() => window.__game!.session.selectedTowerId))
    .not.toBeNull()
  await shot('2-selected')

  // U улучшает выбранную башню (достраиваем её и даём кредитов)
  await page.evaluate(() => {
    const g = window.__game!
    g.step(120)
  })
  await page.keyboard.press('KeyU')
  await expect
    .poll(() => page.evaluate(() => window.__game!.state!.towers[0]?.phase))
    .toBe('upgrading')
  await shot('5-upgrading')
  await page.keyboard.press('KeyU')
  await expect
    .poll(() => page.evaluate(() => window.__game!.state!.towers[0]?.phase))
    .toBe('active')

  // R улучшает так же, как U
  await page.keyboard.press('KeyR')
  await expect
    .poll(() => page.evaluate(() => window.__game!.state!.towers[0]?.phase))
    .toBe('upgrading')
  await page.keyboard.press('KeyR')
  await expect
    .poll(() => page.evaluate(() => window.__game!.state!.towers[0]?.phase))
    .toBe('active')

  // S двигает камеру при выбранной башне и не продаёт
  const beforeS = await at()
  await page.keyboard.down('KeyS')
  await page.waitForTimeout(300)
  await page.keyboard.up('KeyS')
  const afterS = await at()
  expect(Math.hypot(afterS.x - beforeS.x, afterS.y - beforeS.y)).toBeGreaterThan(5)
  expect((await snapshot(page)).towers).toBe(before.towers + 1)

  // Q/E циклят выбор между башнями, камера не прыгает
  const cell2 = await pickBuildable(page, 5)
  await page.evaluate((c) => {
    const g = window.__game!
    g.session.dispatch({ type: 'placeTower', towerType: g.state!.towers[0]!.type, cell: c })
    g.step(120)
  }, cell2)
  const sel = () => page.evaluate(() => window.__game!.session.selectedTowerId)
  const first = await sel()
  await page.keyboard.press('KeyE')
  const second = await sel()
  expect(second).not.toBe(first)
  await page.keyboard.press('KeyQ')
  expect(await sel()).toBe(first)

  // X продаёт выбранную
  const count = (await snapshot(page)).towers
  await page.keyboard.press('KeyX')
  await expect.poll(async () => (await snapshot(page)).towers).toBe(count - 1)
  await page.evaluate(() => window.__game!.session.select(null))

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
