import { expect, test } from '@playwright/test'
import { openBattle } from './helpers'

// справка по клавишам: H открывает, Esc закрывает, кнопка «?» работает, подписи из таблицы
test('справка по клавишам', async ({ page }, info) => {
  await openBattle(page)
  const dlg = page.getByTestId('key-help')
  await expect(dlg).toBeHidden()
  await page.keyboard.press('KeyH')
  await expect(dlg).toBeVisible()
  await expect(dlg).toHaveAttribute('role', 'dialog')
  await expect(page.getByTestId('help-sell')).toContainText('X / Delete')
  await expect(page.getByTestId('help-buildSlot')).toContainText('1–9')
  await expect(page.getByTestId('help-help')).toContainText('H')
  await page.screenshot({ path: info.outputPath('help.png') })
  await page.keyboard.press('Escape')
  await expect(dlg).toBeHidden()
  await page.getByTestId('hud-help').click()
  await expect(dlg).toBeVisible()
  await page.keyboard.press('KeyH')
  await expect(dlg).toBeHidden()
})
