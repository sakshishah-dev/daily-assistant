import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4300',
    viewport: { width: 390, height: 844 }, // small iPhone
    hasTouch: true,
    isMobile: true,
    serviceWorkers: 'block',
    trace: 'off',
    // Locally the sandbox has its own Chromium; on a normal machine run "npx playwright install chromium" and leave this unset.
    launchOptions: { executablePath: process.env.CHROMIUM_PATH || undefined },
  },
  webServer: { command: 'node e2e/serve.mjs', url: 'http://localhost:4300', reuseExistingServer: true, timeout: 20_000 },
});
