import { defineConfig, devices } from '@playwright/test';

const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ||
  (process.env.VERCEL_URL?.startsWith('http')
    ? process.env.VERCEL_URL
    : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://www.tuviminhbao.com');

// Preview nằm sau Vercel Authentication (SSO). Vé qua cửa lấy bằng COOKIE, KHÔNG
// phải bằng `extraHTTPHeaders` — xem `tests/auth.setup.ts`.
//
// 🔴 Vì sao không dùng header: `extraHTTPHeaders` áp lên MỌI request, kể cả
// KHÁC ORIGIN. Gắn header lạ vào một request cross-origin làm nó thành preflight,
// mà `fonts.gstatic.com` không cho phép header đó ⇒ font bị CORS chặn ⇒ lỗi
// console ⇒ 26 ca "không có JS errors nghiêm trọng" đỏ oan. Đã đo thật, không
// phải lo hão.

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
