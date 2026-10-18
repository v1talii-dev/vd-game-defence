import { expect, test } from '@playwright/test'
import { cellClient, openBattle, pickBuildable, snapshot } from './helpers'

test.describe('мобильный', () => {
  test.skip(({ isMobile }) => !isMobile, 'только мобильные проекты')

  test('тап по клетке → превью → «Построить» → башня есть', async ({ page }) => {
    await openBattle(page, '?seed=1')
    const before = await snapshot(page)
    const cell = await pickBuildable(page)

    await page.getByTestId('build-machineGun').tap()
    await expect(page.getByTestId('build-machineGun')).toHaveAttribute('aria-pressed', 'true')
    const pt = await cellClient(page, cell)
    await page.touchscreen.tap(pt.x, pt.y)

    // на таче клетка только помечается, постройка ждёт подтверждения
    await expect.poll(() => page.evaluate(() => window.__game!.session.pendingCell)).toEqual(cell)
    expect((await snapshot(page)).towers).toBe(0)

    await page.getByTestId('build-confirm').tap()
    await expect.poll(async () => (await snapshot(page)).towers).toBe(1)
    expect((await snapshot(page)).money).toBeLessThan(before.money)
    await expect(page.getByTestId('build-confirm')).toBeHidden()
  })

  test('портретная ориентация: подсказка про поворот', async ({ page }) => {
    await openBattle(page, '?seed=1')
    await expect(page.getByText('Поверните устройство горизонтально')).toBeHidden()
    const { width, height } = page.viewportSize()!
    await page.setViewportSize({ width: Math.min(width, height), height: Math.max(width, height) })
    await expect(page.getByText('Поверните устройство горизонтально')).toBeVisible()
  })

  // pinch в Playwright нет штатного API: нужны CDP Input.dispatchTouchEvent с двумя точками,
  // а Phaser-pinch завязан на два активных указателя — ненадёжно, проверить вручную
  test.fixme('pinch-зум не ломает выбор клетки', () => {})
})
