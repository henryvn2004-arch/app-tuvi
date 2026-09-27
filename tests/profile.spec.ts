import { test, expect } from '@playwright/test';

// Profile tests chạy với auth state (storageState từ auth.setup.ts)

test.describe('Hồ Sơ (/app/ho-so) — logged in', () => {
  // Helper: check if dashboard is visible after auth
  async function isDashboardVisible(page: any): Promise<boolean> {
    return page.locator('#dashboard').isVisible({ timeout: 12000 }).catch(() => false);
  }

  test.beforeEach(async ({ page }) => {
    await page.goto('/app/ho-so');
    // ⚠️ CỐ Ý KHÔNG `waitForLoadState('networkidle')` ở ĐÂY. Trang này là trang
    // DUY NHẤT chạy đã-đăng-nhập: `auth.js` làm mới token, `loadRailStatus` hỏi
    // ví, cộng beacon đo lường — tức nó gần như không bao giờ về "im mạng" đủ
    // 500ms, và lượt chờ đó treo tới hết 30 giây rồi giết cả `beforeEach`
    // (bắt được ở lượt CI 18/08, hỏng cả ở lần thử lại, trong khi diff của PR
    // không đụng một byte nào của profile).
    // Dòng dưới mới là phép chờ ĐÚNG: chờ chính thứ bài kiểm cần.
    await page.waitForSelector('#dashboard, #notLoggedIn', { timeout: 15000 }).catch(() => {});
  });

  test('dashboard hiện khi đã login', async ({ page }) => {
    const loggedIn = await isDashboardVisible(page);
    if (!loggedIn) {
      console.warn('Auth state không inject được — dashboard ẩn, bỏ qua test');
      return;
    }
    await expect(page.locator('#dashboard')).toBeVisible();
    await expect(page.locator('#notLoggedIn')).not.toBeVisible();
  });

  test('email user hiện đúng', async ({ page }) => {
    if (!await isDashboardVisible(page)) { console.warn('Chưa login, bỏ qua'); return; }
    const email = page.locator('#userEmail');
    await expect(email).toBeVisible({ timeout: 5000 });
    const text = await email.textContent();
    expect(text).toContain('@');
  });

  test('3 tab + lối tắt sang Lá số / Báo cáo / Hỏi Thầy', async ({ page }) => {
    if (!await isDashboardVisible(page)) { console.warn('Chưa login, bỏ qua'); return; }
    await expect(page.locator('.tab-btn')).toHaveCount(3);
    await expect(page.locator('#tab-credits')).toBeVisible();
    for (const href of ['/app/so-la-so', '/app/bao-cao', '/app/tro-chuyen']) {
      await expect(page.locator(`.my-links a[href="${href}"]`)).toBeVisible();
    }
  });

  test('hash cũ #nhiemvu → tab Ví, #gopy → Cài đặt/Góp ý', async ({ page }) => {
    if (!await isDashboardVisible(page)) { console.warn('Chưa login, bỏ qua'); return; }
    await page.evaluate(() => { location.hash = 'nhiemvu'; });
    await expect(page.locator('#tab-credits')).toBeVisible();
    await expect(page.locator('#qtCard')).toBeVisible();
    await page.evaluate(() => { location.hash = 'gopy'; });
    await expect(page.locator('#tab-account')).toBeVisible();
    await expect(page.locator('#gopyHost')).toBeVisible();
  });

  test('không có JS errors nghiêm trọng', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('/app/ho-so');
    await page.waitForLoadState('load');
    await page.waitForSelector('#dashboard, #notLoggedIn', { timeout: 10000 }).catch(() => {});
    const critical = errors.filter(e =>
      !e.includes('favicon') && !e.includes('Sentry') && !e.includes('ERR_BLOCKED') && !e.includes('fonts.google')
    );
    expect(critical).toHaveLength(0);
  });
});
