import { defineConfig, devices } from '@playwright/test';

/**
 * PixelRealm E2E smoke test configuration.
 *
 * Smoke tests split into two projects:
 *   client  — no server required; Vite dev server only (port 3000)
 *   server  — requires auth server on port 3001 (set E2E_AUTH_URL)
 *
 * Run all:          npm run test:e2e
 * Run client only:  npm run test:e2e -- --project=client
 * Run server only:  npm run test:e2e -- --project=server
 */

const AUTH_URL = process.env.E2E_AUTH_URL ?? 'http://localhost:3001';

export default defineConfig({
  testDir: './tests/e2e',
  /* Each test file runs sequentially to avoid racing on the shared browser state */
  fullyParallel: false,
  /* Fail the build on CI if a test.only is accidentally committed */
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'on-failure' }]],

  use: {
    /* Base URL for client tests */
    baseURL: 'http://localhost:3000',
    /* Capture traces on first retry for debugging */
    trace: 'on-first-retry',
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    /* Allow Phaser to use WebGL in headless mode */
    launchOptions: {
      args: ['--disable-web-security', '--no-sandbox'],
    },
  },

  projects: [
    {
      name: 'client',
      use: {
        ...devices['Desktop Chrome'],
        /* Expose auth URL to tests via page env */
        extraHTTPHeaders: {},
      },
      testMatch: ['**/smoke.spec.ts'],
    },
    {
      name: 'integration',
      use: {
        ...devices['Desktop Chrome'],
        extraHTTPHeaders: {},
      },
      testMatch: ['**/integration.spec.ts'],
    },
  ],

  /* Auto-start Vite dev server for client tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },

  /* Pass auth URL to tests */
  globalSetup: undefined,
  expect: {
    timeout: 15_000,
  },
  timeout: 60_000,
});
