import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.PROD_URL || 'https://tuviminhbao.com';

// Preview deployment nằm sau Vercel Authentication (SSO) → mọi request ăn 401.
// Chìa để qua cửa là "Protection Bypass for Automation": một secret khai trong
// Vercel (Settings → Deployment Protection), gửi kèm header ở mỗi request.
// Domain prod KHÔNG bị gác, header thừa ở đó vô hại → không cần rẽ nhánh theo URL.
// `x-vercel-set-bypass-cookie` để lượt điều hướng tiếp theo của trang mang sẵn
// cookie, không phải trang con nào cũng dựa vào header (redirect, asset).
const BYPASS = process.env.VERCEL_BYPASS_SECRET;
const BYPASS_HEADERS = BYPASS
  ? { 'x-vercel-protection-bypass': BYPASS, 'x-vercel-set-bypass-cookie': 'true' }
  : undefined;

export default defineConfig({
  testDir: './tests/smoke',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 2,
  timeout: 60_000,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report-smoke' }],
    ['json', { outputFile: 'playwright-report-smoke/results.json' }],
  ],
  use: {
    baseURL: BASE_URL,
    extraHTTPHeaders: BYPASS_HEADERS,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    ignoreHTTPSErrors: false,
  },
  projects: [
    {
      name: 'smoke-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
