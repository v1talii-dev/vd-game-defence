import { expect, test, type Page } from '@playwright/test'
import { openBattle } from './helpers'

// Подготовка использует только команды игры: урон наносят настоящие враги.
async function underFire(page: Page, ruins: boolean) {
  await openBattle(page, '?seed=1')
  // ponytail: debug API принимает 0 на практике, хотя тип ограничен 1/2/8; UI остаётся доступным.
  await page.evaluate(() => window.__game!.setSpeed(0 as 1))
  const result = await page.evaluate((destroy) => {
    const g = window.__game!
    const start = g.level.path[0]!
    const cell = [...g.level.buildable].sort(
      (a, b) =>
        (a.x + 0.5 - start.x) ** 2 +
        (a.y + 0.5 - start.y) ** 2 -
        ((b.x + 0.5 - start.x) ** 2 + (b.y + 0.5 - start.y) ** 2),
    )[0]!
    g.dispatch({ type: 'placeTower', towerType: 'machineGun', cell })
    g.step(120)
    const id = g.state!.towers[0]!.id
    g.session.select(id)
    g.dispatch({ type: 'startWave' })
    g.dispatch({ type: 'spawnEnemies', enemyType: 'boss', count: destroy ? 3 : 1, spacing: 0 })
    for (let i = 0; i < 1800; i++) {
      g.step(1)
      const t = g.state!.towers.find((tower) => tower.id === id)!
      if (destroy ? t.phase === 'ruins' : t.hp > 0 && t.hp < t.maxHp) return { id, cell }
      if (g.state!.outcome) break
    }
    throw new Error('Враг не нанёс ожидаемый урон башне за 1800 тиков')
  }, ruins)
  await expect(page.getByTestId('tower-panel')).toBeVisible()
  return result
}

async function tower(page: Page, id: number) {
  return page.evaluate((towerId) => {
    const t = window.__game!.state!.towers.find((item) => item.id === towerId)!
    return { ...t, money: window.__game!.state!.money }
  }, id)
}

for (const method of ['button', 'keyboard'] as const) {
  test(`ремонт ${method === 'button' ? 'кнопкой' : 'клавишей C'}`, async ({ page }) => {
    const { id } = await underFire(page, false)
    const before = await tower(page, id)
    await expect(page.getByTestId('tower-hp')).toHaveText(
      `HP ${Math.ceil(before.hp)}/${before.maxHp}`,
    )
    await expect(page.getByTestId('tower-repair')).toBeEnabled()
    await expect(page.getByTestId('tower-repair')).toContainText(String(before.repairCost))
    if (method === 'button') await page.getByTestId('tower-repair').click()
    else await page.keyboard.press('KeyC')
    // Панель синхронизирует прогресс раз в 5 тиков, а не сразу после события.
    await page.evaluate(() => window.__game!.step(5))
    const started = await tower(page, id)
    expect(started.money).toBe(before.money - before.repairCost)
    expect(started.repairProgress).not.toBeNull()
    await expect(page.getByTestId('tower-repair-progress')).toBeVisible()
    await expect(page.getByTestId('tower-repair')).toBeDisabled()
    await page.evaluate(() => window.__game!.step(10))
    expect((await tower(page, id)).hp).toBeGreaterThan(before.hp)
  })
}

test('руины восстанавливаются через панель', async ({ page }) => {
  const { id } = await underFire(page, true)
  await expect(page.getByTestId('tower-restore')).toBeVisible()
  await expect(page.getByTestId('tower-clear')).toBeVisible()
  await expect(page.getByTestId('tower-sell')).toHaveCount(0)
  await page.getByTestId('tower-restore').click()
  await page.evaluate(() => window.__game!.step(1))
  expect((await tower(page, id)).phase).toBe('building')
  await page.evaluate(() => window.__game!.step(120))
  const restored = await tower(page, id)
  expect(restored.phase).toBe('active')
  expect(restored.hp).toBeGreaterThan(0)
})

test('уборка руин освобождает клетку без оплаты', async ({ page }) => {
  const { id, cell } = await underFire(page, true)
  const money = (await tower(page, id)).money
  await page.getByTestId('tower-clear').click()
  await page.evaluate(() => window.__game!.step(1))
  expect(await page.evaluate((i) => window.__game!.state!.towers.some((t) => t.id === i), id)).toBe(
    false,
  )
  expect(await page.evaluate(() => window.__game!.state!.money)).toBe(money)
  await page.evaluate((c) => {
    window.__game!.dispatch({ type: 'placeTower', towerType: 'machineGun', cell: c })
    window.__game!.step(1)
  }, cell)
  expect(
    await page.evaluate(
      (c) => window.__game!.state!.towers.some((t) => t.cell.x === c.x && t.cell.y === c.y),
      cell,
    ),
  ).toBe(true)
})

test('справка H показывает клавишу ремонта', async ({ page }) => {
  await openBattle(page, '?seed=1')
  await page.keyboard.press('KeyH')
  await expect(page.getByTestId('key-help')).toBeVisible()
  await expect(page.getByTestId('help-repair')).toContainText('C')
})
