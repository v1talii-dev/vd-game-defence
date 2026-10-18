import { defineConfig, devices } from '@playwright/test'

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
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7 landscape'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 14 landscape'] } },
  ],
  webServer: {
    // сборка в режиме test сохраняет window.__game (SPEC §6.5)
    command: `npx vite build --mode test --outDir dist-test && npx vite preview --outDir dist-test --port ${PORT} --strictPort`,
    url: BASE,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
