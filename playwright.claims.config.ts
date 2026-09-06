import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/claims',
  timeout: 45_000,
  fullyParallel: false,
  workers: 1,
  use: { browserName: 'chromium' },
  webServer: {
    command: 'npm run preview',
    url: 'http://127.0.0.1:4173/',
    reuseExistingServer: false,
  },
});
