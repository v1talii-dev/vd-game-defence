import { expect, test } from '@playwright/test'
import { playFromMenu } from './helpers'

const SAVE_V1 = {
  version: 1,
  levels: { 'desert-base': { stars: 2, bestHp: 12 } },
  settings: { volume: 0.7, sfx: true, showRanges: false },
  tutorialDone: true,
}

test('свежее сохранение: desert-base открыт, stub-2 закрыт и не запускается', async ({
  page,
}, info) => {
  await page.goto('./')
  await page.getByRole('link', { name: 'Играть' }).click()
  await expect(page.getByTestId('level-card-desert-base')).toBeEnabled()
  const locked = page.getByTestId('level-card-stub-2')
  await expect(locked).toBeDisabled()
  await expect(locked).toContainText('Пройдите уровень 1')
  await page.screenshot({ path: info.outputPath('campaign.png') })

  await page.getByTestId('level-card-desert-base').click()
  await expect(page.getByTestId('level-briefing')).not.toHaveCount(0)
  await expect(page.getByTestId('level-tower-machineGun')).toBeVisible()
  await page.screenshot({ path: info.outputPath('briefing.png') })

  await page.goto('./#/battle/stub-2')
  await expect(page).toHaveURL(/#\/campaign/)
})

test('сохранение v1 мигрирует: звёзды видны на карточке, stub-2 открыт, но «Скоро»', async ({
  page,
}) => {
  await page.addInitScript((save) => {
    if (!localStorage.getItem('vdgd:save:v2'))
      localStorage.setItem('vdgd:save:v1', JSON.stringify(save))
  }, SAVE_V1)
  await page.goto('./#/campaign')
  await expect(
    page.getByTestId('level-card-desert-base').getByRole('img', { name: 'Звёзд: 2 из 3' }),
  ).toBeVisible()
  const soon = page.getByTestId('level-card-stub-2')
  await expect(soon).toContainText('Скоро')
  await expect(soon).toBeDisabled()
})

test('победа → результат → «Повторить» тот же уровень; звёзды не уменьшаются', async ({ page }) => {
  test.setTimeout(60_000)
  await page.addInitScript((save) => {
    if (!localStorage.getItem('vdgd:save:v2'))
      localStorage.setItem('vdgd:save:v1', JSON.stringify(save))
  }, SAVE_V1)
  await page.goto('./')
  await playFromMenu(page)
  await page.waitForFunction(() => !!window.__game?.state && window.__game.ready)
  // поражение без башен не должно затирать сохранённые звёзды
  await page.evaluate(() => {
    const g = window.__game!
    g.setSpeed(8)
    while (!g.state!.outcome && g.state!.tick < 30 * 60 * 30) {
      if (g.state!.wave.phase === 'prep') g.dispatch({ type: 'startWave' })
      g.step(30)
    }
  })
  await expect(page.getByTestId('result-dialog')).toBeVisible()
  await expect(page.getByTestId('result-next')).toHaveCount(0)
  await page.getByTestId('result-restart').click()
  await expect(page.getByTestId('result-dialog')).toHaveCount(0)
  await expect(page).toHaveURL(/#\/battle\/desert-base/)
  const stars = await page.evaluate(
    () => JSON.parse(localStorage.getItem('vdgd:save:v2')!).levels['desert-base'].stars,
  )
  expect(stars).toBe(2)
})
