import { defineConfig, devices } from '@playwright/test';
import { SESSIONS } from './src/data/constants';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],

  globalSetup: './global-setup.ts',

  use: {
    baseURL: 'https://practice.expandtesting.com/notes/app',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  projects: [
    // Setup project — runs global-setup implicitly via globalSetup above,
    // but we keep explicit dependency-free auth projects for clarity.
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: SESSIONS.alice,
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: SESSIONS.alice,
      },
    },
  ],
});
