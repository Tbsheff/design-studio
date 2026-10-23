import { defineConfig } from '@playwright/test';
import { BASE_URL } from './e2e/support/server';

export default defineConfig({
  testDir: './e2e/ac/edit',
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180_000,
  expect: { timeout: 20_000 },
  reporter: [['list']],
  globalSetup: './scripts/ac-edit/global-setup.ts',
  globalTeardown: './scripts/ac-edit/global-teardown.ts',
  outputDir: './verification/ac-edit-artifacts',
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
