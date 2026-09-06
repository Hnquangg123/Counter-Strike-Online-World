import 'dotenv/config'
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chromium' } }],
  webServer: {
    command: 'pnpm dev',
    reuseExistingServer: true,
    url: 'http://localhost:3000',
    timeout: 180_000,
  },
})
