import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({
  path: path.resolve(process.cwd(), '.env'),
  quiet: true,
});

const isCI = Boolean(process.env.CI);

const configuredWorkers = Number(process.env.WORKERS);

const workers =
  Number.isInteger(configuredWorkers) && configuredWorkers > 0 ? configuredWorkers : 2;

export default defineConfig({
  testDir: './src/tests',

  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers,

  reporter: [
    ['list'],
    [
      'html',
      {
        outputFolder: 'playwright-report',
        open: 'never',
      },
    ],
  ],

  use: {
    baseURL: process.env.BASE_URL ?? 'https://automationexercise.com',

    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: {
          width: 1280,
          height: 720,
        },
      },
    },
  ],

  outputDir: 'test-results',
});
