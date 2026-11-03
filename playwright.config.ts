import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // The emulator-backed specs sign in as the same deterministic CI user and
  // reset the shared emulator, so they must never overlap each other.
  workers: 1,
  reporter: 'list',
  // Snapshot baselines are per platform/font stack, so the folder says which.
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  expect: {
    // Visual baselines: a shifted-but-identical page must still fail loudly.
    toHaveScreenshot: { threshold: 0.2 },
  },
  webServer: {
    command: 'npm run preview -- --host 0.0.0.0',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
})
