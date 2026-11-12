import { expect, test } from '@playwright/test'

for (const quality of ['high', 'low'] as const) {
  test(`единый стек: ${quality}, частицы, пауза и resize`, async ({ page }) => {
    const errors: string[] = []
    const rapierRequests: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    page.on('request', (request) => {
      if (/rapier/i.test(request.url())) rapierRequests.push(request.url())
    })
    // Quality читается из location.search, а не из query внутри hash-router.
    await page.goto(`./?quality=${quality}#/battle/desert-base`)
    await page.waitForFunction(() => window.__game?.ready)
    await expect.poll(() => page.evaluate(() => window.__game!.fxState().quality)).toBe(quality)
    const fx = await page.evaluate(() => window.__game!.fxState())
    expect(fx.composerEnabled).toBe(quality === 'high')
    expect(fx.quarksSystems).toBe(1)
    if (quality === 'high') {
      await expect.poll(() => page.evaluate(() => window.__game!.fxState().rapierReady)).toBe(true)
    } else {
      expect(fx.rapierReady).toBe(false)
    }
    // Постройка заканчивается в симуляции; следующий кадр выпускает Quarks burst.
    await page.evaluate(() => {
      const g = window.__game!
      g.dispatch({ type: 'placeTower', towerType: 'machineGun', cell: g.level.buildable[0] })
      g.step(61)
    })
    await expect
      .poll(() => page.evaluate(() => window.__game!.fxState().quarksParticles))
      .toBeGreaterThan(0)
    const pausedParticles = await page.evaluate(() => {
      window.__game!.session.paused = true
      return window.__game!.fxState().quarksParticles
    })
    for (const size of [
      { width: 1280, height: 720 },
      { width: 1920, height: 1080 },
    ]) {
      await page.setViewportSize(size)
      await expect
        .poll(() => page.locator('[data-testid=battlefield] canvas').evaluate((c) => c.clientWidth))
        .toBe(size.width)
      const state = await page.evaluate(() => ({
        fx: window.__game!.fxState(),
        gl: window.__game!.glInfo(),
      }))
      expect(state.fx.quarksParticles).toBe(pausedParticles)
      expect(state.fx.quarksParticles).toBeLessThanOrEqual(quality === 'high' ? 16 : 7)
      expect(state.fx.quarksSystems).toBe(1)
      expect(state.gl.calls).toBeGreaterThan(0)
    }
    if (quality === 'low') expect(rapierRequests).toEqual([])
    expect(errors).toEqual([])
  })
}

test('брифинг: reduced motion и быстрый возврат не оставляют скрытый слой', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('./#/campaign')
  for (let i = 0; i < 3; i++) {
    await page.getByTestId('level-card-desert-base').click()
    const panel = page.getByTestId('level-briefing-screen')
    await expect(panel).toBeVisible()
    await expect(panel).toHaveCSS('transform', 'none')
    await expect(panel).toHaveCSS('opacity', '1')
    await page.getByTestId('level-back').click()
    await expect(panel).toHaveCount(0)
  }
  await page.getByTestId('level-card-desert-base').click()
  await page.getByTestId('level-start').click()
  await page.waitForFunction(() => window.__game?.ready)
})
