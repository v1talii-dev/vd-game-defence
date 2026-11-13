import { expect, test } from '@playwright/test'

for (const quality of ['high', 'low'] as const) {
  test('потеря WebGL-контекста: ' + quality, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto(`./?quality=${quality}#/battle/desert-base?seed=1`)
    await page.waitForFunction(() => window.__game?.ready)
    expect(await page.evaluate(() => window.__game!.fxState().quality)).toBe(quality)
    await page.evaluate(() => {
      const gl = document.querySelector('canvas')!.getContext('webgl2')!
      const ext = gl.getExtension('WEBGL_lose_context')!
      Object.assign(window, { __ext: ext })
      ext.loseContext()
    })
    await expect(page.getByTestId('gl-lost')).toBeVisible()
    const lostTick = await page.evaluate(() => window.__game!.state!.tick)
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        }),
    )
    expect(await page.evaluate(() => window.__game!.state!.tick)).toBe(lostTick)
    await page.evaluate(() =>
      (window as unknown as { __ext: { restoreContext(): void } }).__ext.restoreContext(),
    )
    await expect(page.getByTestId('gl-lost')).toHaveCount(0)
    const tick0 = await page.evaluate(() => window.__game!.state!.tick)
    await expect.poll(() => page.evaluate(() => window.__game!.state!.tick)).toBeGreaterThan(tick0)
    expect(errors).toEqual([])

    // Контекстная пауза не должна сбрасывать паузу, включённую самим игроком.
    await page.evaluate(() => {
      window.__game!.session.paused = true
      ;(window as unknown as { __ext: { loseContext(): void } }).__ext.loseContext()
    })
    await expect(page.getByTestId('gl-lost')).toBeVisible()
    await page.evaluate(() =>
      (window as unknown as { __ext: { restoreContext(): void } }).__ext.restoreContext(),
    )
    await expect(page.getByTestId('gl-lost')).toHaveCount(0)
    expect(await page.evaluate(() => window.__game!.session.paused)).toBe(true)
    await expect.poll(() => page.evaluate(() => window.__game!.glInfo().calls)).toBeGreaterThan(0)
    await page.screenshot({ path: `test-results/s2-restored-${quality}.png` })
    expect(errors).toEqual([])
  })
}
