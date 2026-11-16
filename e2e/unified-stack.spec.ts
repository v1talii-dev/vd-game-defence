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
    expect(fx.quarksSystems).toBeGreaterThan(0)
    expect(fx.quarksSystems).toBeLessThanOrEqual(quality === 'high' ? 128 : 48)
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
      const dpr = Math.min(
        await page.evaluate(() => devicePixelRatio),
        quality === 'high' ? 2 : 1.5,
      )
      await expect
        .poll(() =>
          page.locator('[data-testid=battlefield] canvas').evaluate((c) => {
            const canvas = c as HTMLCanvasElement
            return { width: canvas.width, height: canvas.height }
          }),
        )
        .toEqual({ width: Math.floor(size.width * dpr), height: Math.floor(size.height * dpr) })
      const state = await page.evaluate(() => ({
        fx: window.__game!.fxState(),
        gl: window.__game!.glInfo(),
      }))
      expect(state.fx.quarksParticles).toBe(pausedParticles)
      expect(state.fx.quarksParticles).toBeLessThanOrEqual(quality === 'high' ? 128 : 48)
      expect(state.fx.quarksSystems).toBe(fx.quarksSystems)
      expect(state.gl.calls).toBeGreaterThan(0)
      expect(state.gl.calls).toBeLessThanOrEqual(150)
      await page.screenshot({
        path: `test-results/s3-${quality}-${size.width}.png`,
        style: '.overlay:has([data-testid="pause-menu"]) { visibility: hidden !important; }',
      })
    }
    if (quality === 'low') expect(rapierRequests).toEqual([])
    expect(errors).toEqual([])
  })

  test(`Quarks: ${quality}, выстрелы, попадания, дым, разрушение и повторный бой`, async ({
    page,
  }) => {
    test.setTimeout(60_000)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    await page.goto(`./?quality=${quality}#/battle/desert-base?seed=1&money=9999`)
    await page.waitForFunction(() => window.__game?.ready)
    if (quality === 'high') {
      await expect.poll(() => page.evaluate(() => window.__game!.fxState().rapierReady)).toBe(true)
    }
    const initialSystems = await page.evaluate(() => window.__game!.fxState().quarksSystems)
    const towerId = await page.evaluate(() => {
      const g = window.__game!
      const start = g.level.path[0]!
      const cells = [...g.level.buildable].sort(
        (a, b) =>
          (a.x + 0.5 - start.x) ** 2 +
          (a.y + 0.5 - start.y) ** 2 -
          ((b.x + 0.5 - start.x) ** 2 + (b.y + 0.5 - start.y) ** 2),
      )
      g.dispatch({ type: 'placeTower', towerType: 'machineGun', cell: cells[0] })
      g.dispatch({ type: 'placeTower', towerType: 'rocket', cell: cells[1] })
      g.step(120)
      return g.state!.towers[0]!.id
    })
    await expect
      .poll(() => page.evaluate(() => window.__game!.fxState().quarksSpawned.done))
      .toBeGreaterThan(0)
    // Дожидаемся конца строительства и затухания вспышек до боевых событий.
    await expect.poll(() => page.evaluate(() => window.__game!.fxState().quarksParticles)).toBe(0)
    await page.evaluate(() => {
      const g = window.__game!
      g.setSpeed(2)
      g.dispatch({ type: 'startWave' })
      g.dispatch({ type: 'spawnEnemies', enemyType: 'boss', count: 3, spacing: 0 })
    })
    await page.waitForFunction(
      (id) => {
        const g = window.__game!
        const counts = g.fxState().quarksSpawned
        const complete = (
          counts.flash > 0 &&
          counts.spark > 0 &&
          counts.puff > 0 &&
          counts.explosion > 0 &&
          g.state!.towers.find((t) => t.id === id)?.phase === 'ruins'
        )
        if (complete) g.session.paused = true
        return complete
      },
      towerId,
      { timeout: 30_000 },
    )
    const debris = await page.evaluate(() => window.__game!.fxState().debris)
    expect(quality === 'high' ? debris > 0 : debris === 0).toBe(true)
    expect(await page.evaluate(() => window.__game!.fxState().quarksParticles)).toBeLessThanOrEqual(
      quality === 'high' ? 128 : 48,
    )
    await page.screenshot({ path: `test-results/s3-${quality}-combat.png` })
    // Исход боя получаем обычными командами, чтобы проверить настоящий «Повторить».
    await page.evaluate(() => {
      const g = window.__game!
      g.session.paused = true
      while (!g.state!.outcome && g.state!.tick < 54_000) {
        if (g.state!.wave.phase === 'prep') g.dispatch({ type: 'startWave' })
        g.step(30)
      }
    })
    await expect(page.getByTestId('result-restart')).toBeVisible()
    await page.getByTestId('result-restart').click()
    await page.waitForFunction(
      () =>
        window.__game?.ready &&
        !window.__game.state?.outcome &&
        !window.__game.state?.towers.length,
    )
    const reset = await page.evaluate(() => window.__game!.fxState())
    expect(reset.quarksParticles).toBe(0)
    expect(reset.debris).toBe(0)
    expect(reset.quarksSystems).toBe(initialSystems)
    expect(Object.values(reset.quarksSpawned).every((count) => count === 0)).toBe(true)
    await page.evaluate(() => {
      const g = window.__game!
      g.dispatch({ type: 'placeTower', towerType: 'machineGun', cell: g.level.buildable[0] })
      g.step(120)
    })
    await expect
      .poll(() => page.evaluate(() => window.__game!.fxState().quarksSpawned.done))
      .toBe(1)
    expect(errors).toEqual([])
  })
}

test('выход во время загрузки Rapier не создаёт мир после уничтожения сцены', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  let requested!: () => void
  const requestStarted = new Promise<void>((resolve) => {
    requested = resolve
  })
  let continued!: () => void
  const requestContinued = new Promise<void>((resolve) => {
    continued = resolve
  })
  await page.route('**/*rapier*.js', async (route) => {
    requested()
    await gate
    await route.continue().catch(() => {})
    continued()
  })
  await page.goto('./?quality=high#/battle/desert-base')
  await requestStarted
  await page.waitForFunction(() => window.__game?.ready)
  expect(await page.evaluate(() => window.__game!.fxState().rapierReady)).toBe(false)
  await page.evaluate(() => {
    location.hash = '#/campaign'
  })
  await expect(page.getByTestId('level-card-desert-base')).toBeVisible()
  release()
  await requestContinued
  await page.getByTestId('level-card-desert-base').click()
  await page.getByTestId('level-start').click()
  await page.waitForFunction(() => window.__game?.ready && window.__game.fxState().rapierReady)
  expect(await page.evaluate(() => window.__game!.fxState().debris)).toBe(0)
  expect(errors).toEqual([])
})

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
