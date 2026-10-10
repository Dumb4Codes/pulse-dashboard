import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  // Every test signs in through the UI against one shared production server; a few workers keep
  // that fast and deterministic (a dozen headless browsers just starve each other on a laptop).
  workers: 3,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: { baseURL: 'http://localhost:3000', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Dev-server alternative (faster, less faithful): 'npm run dev'
    command: 'npm run build && npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 240_000,
    env: { AUTH_SECRET: 'e2e-secret-e2e-secret-e2e-secret' },
  },
});
