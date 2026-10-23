import { expect, test } from '@playwright/test'
import { cellClient, openBattle, pickBuildable } from './helpers'

test('стрелки пути запускаются в начале боя и при старте волны', async ({ page }) => {
  await openBattle(page, '?seed=1')
  await expect.poll(() => page.evaluate(() => window.__game!.fxState().arrowStarts)).toBe(1)
  expect(await page.evaluate(() => window.__game!.fxState().arrowsActive)).toBe(true)
  await expect.poll(() => page.evaluate(() => window.__game!.fxState().arrowsActive)).toBe(false)
  await page.evaluate(() => {
    window.__game!.dispatch({ type: 'startWave' })
    window.__game!.step(2)
  })
  await expect.poll(() => page.evaluate(() => window.__game!.fxState().arrowStarts)).toBe(2)
})

test('наведение на слот показывает кольцо радиуса над клеткой под курсором', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'только десктоп')
  await openBattle(page, '?seed=1')
  expect(await page.evaluate(() => window.__game!.fxState().previewRange)).toBeNull()
  await page.evaluate(() => window.__game!.session.setHoveredBuildType('machineGun'))
  await expect
    .poll(() => page.evaluate(() => window.__game!.fxState().previewRange))
    .toBeGreaterThan(0)
  await page.evaluate(() => window.__game!.session.setHoveredBuildType(null))
  await expect.poll(() => page.evaluate(() => window.__game!.fxState().previewRange)).toBeNull()
  // после движения по карте кольцо у запомненной клетки, даже когда курсор ушёл с canvas
  const cell = await pickBuildable(page, 3)
  const pt = await cellClient(page, cell)
  await page.mouse.move(pt.x, pt.y)
  await page.mouse.move(640, 5)
  await page.evaluate(() => window.__game!.session.setHoveredBuildType('machineGun'))
  await expect
    .poll(() => page.evaluate(() => window.__game!.fxState().previewRange))
    .toBeGreaterThan(0)
})
