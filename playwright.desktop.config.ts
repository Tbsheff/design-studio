import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: /desktop(-[a-z]+)?\.spec\.ts$/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 300_000,
  expect: { timeout: 30_000 },
  reporter: [['list']],
  outputDir: './test-results/desktop',
  use: { actionTimeout: 20_000, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
});
