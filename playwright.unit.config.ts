import { defineConfig } from '@playwright/test';

// Bài kiểm THUẦN NODE (không mở trình duyệt, không cần deploy/đăng nhập) — chạy ở CI lint
// (`npm run test:unit`), KHÔNG nằm trong bộ E2E sau deploy (`playwright.config.ts` bỏ qua `tests/unit`).
// Dùng trình chạy của Playwright vì nó tự dịch TS + alias `@/` của tsconfig, khỏi thêm công cụ.
export default defineConfig({
  testDir: './tests/unit',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  workers: 1,
  reporter: [['list']],
});
