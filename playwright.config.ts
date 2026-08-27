import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/browser',
  timeout: 30_000,
  use: { browserName: 'chromium' },
  webServer: [
    {
      command: 'npx vite preview --config site/vite.config.ts --host 127.0.0.1 --port 4173',
      url: 'http://127.0.0.1:4173/',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'sh -c "./dist/bin/otel-token-meter ingest examples/sample-traces.json --data /tmp/otel-token-meter-playwright.json --prices examples/prices.json && exec ./dist/bin/otel-token-meter serve --listen 127.0.0.1:4319 --data /tmp/otel-token-meter-playwright.json --prices examples/prices.json"',
      url: 'http://127.0.0.1:4319/health',
      reuseExistingServer: !process.env.CI,
    },
  ],
});
