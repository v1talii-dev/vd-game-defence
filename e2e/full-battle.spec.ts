import { expect, test } from '@playwright/test'
import { openBattle } from './helpers'

const SAVE_KEY = 'vdgd:save:v1'
// запас тиков на весь бой: 30 Гц × 30 минут игрового времени
const MAX_TICKS = 30 * 60 * 30

test('полный бой: победа → экран результата → звёзды сохранены после перезагрузки', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await openBattle(page, '?seed=1')
  await page.evaluate(() => window.__game!.setSpeed(8))

  // деньги и сильная оборона: башни на клетках, ближайших к пути, четыре типа по кругу
  const placed = await page.evaluate(() => {
    const g = window.__game!
    g.dispatch({ type: 'grantMoney', amount: 200_000 })
    g.step(1)
    const path = g.level.path
    const dist = (c: { x: number; y: number }) =>
      Math.min(...path.map((p) => Math.hypot(p.x - (c.x + 0.5), p.y - (c.y + 0.5))))
    const cells = [...g.level.buildable].sort((a, b) => dist(a) - dist(b)).slice(0, 40)
    const types = ['machineGun', 'rocket', 'mortar', 'antiAir']
    cells.forEach((cell, i) =>
      g.dispatch({ type: 'placeTower', towerType: types[i % types.length], cell }),
    )
    g.step(1)
    return g.state!.towers.length
  })
  expect(placed).toBeGreaterThan(10)

  // прокрутка симуляции большими порциями в одном evaluate: повторно улучшаем башни,
  // досрочно вызываем волны, пока не появится исход боя
  const outcome = await page.evaluate((max) => {
    const g = window.__game!
    while (!g.state!.outcome && g.state!.tick < max) {
      for (const t of g.state!.towers) g.dispatch({ type: 'upgradeTower', towerId: t.id })
      if (g.state!.wave.phase === 'prep') g.dispatch({ type: 'startWave' })
      g.step(30)
    }
    return g.state!.outcome
  }, MAX_TICKS)
  expect(outcome, 'бой должен закончиться победой').toMatchObject({ result: 'victory' })

  const dialog = page.getByTestId('result-dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('Победа!')).toBeVisible()

  const stars = await page.evaluate(() => {
    const o = window.__game!.state!.outcome
    return o && o.result === 'victory' ? o.stars : 0
  })
  expect(stars).toBeGreaterThanOrEqual(1)
  const saved = () =>
    page.evaluate((k) => {
      const raw = localStorage.getItem(k)
      return raw ? JSON.parse(raw).levels?.['desert-base']?.stars : undefined
    }, SAVE_KEY)
  expect(await saved()).toBe(stars)

  // в меню и после перезагрузки звёзды на месте
  await page.getByTestId('result-menu').click()
  const starsLabel = `Звёзд: ${stars} из 3`
  await expect(page.getByRole('img', { name: starsLabel })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('img', { name: starsLabel })).toBeVisible()
  expect(await saved()).toBe(stars)
})
