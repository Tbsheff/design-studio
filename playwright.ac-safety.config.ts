import { defineConfig } from '@playwright/test';
import { BASE_URL } from './e2e/support/server';

export default defineConfig({
  testDir: './e2e/ac/safety',
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180_000,
  expect: { timeout: 20_000 },
  reporter: [['list']],
  outputDir: './test-results/ac-safety',
  globalSetup: './scripts/ac-safety/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  use: {
    baseURL: BASE_URL,
    channel: 'chrome',
    launchOptions: { args: ['--disable-site-isolation-trials', '--disable-features=IsolateOrigins,site-per-process'] },
    headless: true,
    viewport: { width: 1600, height: 1000 },
    acceptDownloads: true,
    actionTimeout: 20_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
