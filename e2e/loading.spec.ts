import { expect, test } from '@playwright/test'
import { openBattle } from './helpers'

test('экран загрузки виден на медленной сети и исчезает к готовности боя', async ({
  page,
}, info) => {
  // замедляем карту (GLB грузятся лениво и экран не держат), чтобы загрузка шла дольше порога 200 мс
  await page.route('**/*.tmj', async (route) => {
    await new Promise((r) => setTimeout(r, 1500))
    await route.continue()
  })
  const opened = openBattle(page, '?seed=1')
  await expect(page.getByTestId('loading-screen')).toBeVisible()
  await page.screenshot({ path: info.outputPath('loading.png') })
  await opened
  await expect(page.getByTestId('loading-screen')).toHaveCount(0)
})
