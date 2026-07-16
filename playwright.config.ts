import { defineConfig } from '@playwright/test';

export default defineConfig({
  globalSetup: './tests/e2e/global-setup.ts',
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://today-to-do-list.test',
    browserName: 'chromium',
    channel: 'chrome',
  },
});
