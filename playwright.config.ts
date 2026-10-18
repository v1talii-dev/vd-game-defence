import { defineConfig, devices } from '@playwright/test'

// HTTP_PROXY в окружении перехватывает запросы к localhost, и проверка webServer зависает
process.env.NO_PROXY = [process.env.NO_PROXY, 'localhost,127.0.0.1,::1'].filter(Boolean).join(',')
process.env.no_proxy = process.env.NO_PROXY

const PORT = 4173
const BASE = `http://localhost:${PORT}/vd-game-defence/`

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  // мобильные проекты (Pixel 7 / iPhone 14 landscape) временно отключены — вернём позже
  projects: [{ name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // сборка в режиме test сохраняет window.__game (SPEC §6.5)
    command: `npx vite build --mode test --outDir dist-test && npx vite preview --outDir dist-test --port ${PORT} --strictPort`,
    url: BASE,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
