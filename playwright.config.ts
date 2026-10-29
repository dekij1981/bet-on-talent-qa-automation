import { defineConfig, devices, type ReporterDescription } from '@playwright/test';

import { env } from './src/config/env';

const reporters: ReporterDescription[] = [
  ['list'],
  ['html', { outputFolder: 'playwright-report', open: 'never' }],
];

if (env.isCI) {
  reporters.push(['junit', { outputFile: 'reports/junit.xml' }], ['github']);
}

export default defineConfig({
  testDir: './src/tests',

  fullyParallel: true,
  forbidOnly: env.isCI,
  retries: env.retries,
  // The site is a shared public demo; a small worker count avoids rate limiting.
  workers: env.workers,

  reporter: reporters,

  use: {
    baseURL: env.baseUrl,
    testIdAttribute: 'data-qa',

    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],

  outputDir: 'test-results',
});
