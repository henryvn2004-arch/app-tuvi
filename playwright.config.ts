import { defineConfig, devices } from '@playwright/test';

const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ||
  (process.env.VERCEL_URL?.startsWith('http')
    ? process.env.VERCEL_URL
    : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://www.tuviminhbao.com');

// Preview deployment nằm sau Vercel Authentication (SSO). Chìa qua cửa là
// "Protection Bypass for Automation" của Vercel, gửi kèm header mỗi request.
// Domain prod không bị gác nên header thừa ở đó vô hại → không rẽ nhánh theo URL.
// Cùng cơ chế với playwright.smoke.config.ts; sửa một bên thì sửa cả hai.
const BYPASS = process.env.VERCEL_BYPASS_SECRET;
const BYPASS_HEADERS = BYPASS
  ? { 'x-vercel-protection-bypass': BYPASS, 'x-vercel-set-bypass-cookie': 'true' }
  : undefined;

export default defineConfig({
  testDir: './tests',
  testIgnore: ['**/smoke/**'],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  use: {
    baseURL: BASE_URL,
    extraHTTPHeaders: BYPASS_HEADERS,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: 'tests/.auth/user.json' },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        storageState: 'tests/.auth/user.json',
      },
      dependencies: ['setup'],
      testMatch: /mobile\.spec\.ts/,
    },
  ],
});
