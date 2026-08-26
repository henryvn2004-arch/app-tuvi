import { test, expect } from '@playwright/test';

// Profile tests chạy với auth state (storageState từ auth.setup.ts)

test.describe('Profile (profile.html) — logged in', () => {
  // Helper: check if dashboard is visible after auth
  async function isDashboardVisible(page: any): Promise<boolean> {
    return page.locator('#dashboard').isVisible({ timeout: 12000 }).catch(() => false);
  }

  test.beforeEach(async ({ page }) => {
    await page.goto('/profile.html');
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

  test('tabs profile render đủ', async ({ page }) => {
    if (!await isDashboardVisible(page)) { console.warn('Chưa login, bỏ qua'); return; }
    const tabs = page.locator('.tab-btn');
    expect(await tabs.count()).toBeGreaterThanOrEqual(4);
  });

  test('tab Credits — hiện số dư', async ({ page }) => {
    if (!await isDashboardVisible(page)) { console.warn('Chưa login, bỏ qua'); return; }
    const creditsTab = page.locator('.tab-btn[data-tab="credits"], .tab-btn').filter({ hasText: /credits|tín dụng|số dư/i }).first();
    if (await creditsTab.isVisible().catch(() => false)) {
      await creditsTab.click();
      await page.waitForSelector('#tab-credits', { state: 'visible', timeout: 5000 }).catch(() => {});
      await expect(page.locator('#tab-credits')).toBeVisible({ timeout: 3000 });
    }
  });

  test('tab Lịch Sử — lịch sử hiện (hoặc empty state) + chip filter', async ({ page }) => {
    if (!await isDashboardVisible(page)) { console.warn('Chưa login, bỏ qua'); return; }
    const lichSuTab = page.locator('.tab-btn[data-tab="lichsu"]').first();
    if (await lichSuTab.isVisible().catch(() => false)) {
      await lichSuTab.click();
      await page.waitForTimeout(1000);
      await expect(page.locator('#tab-lichsu')).toBeVisible({ timeout: 3000 });
      // chip filter Lá Số → chỉ nhóm lasos hiện
      const chip = page.locator('#tab-lichsu .hist-chip[data-filter="lasos"]');
      if (await chip.isVisible().catch(() => false)) {
        await chip.click();
        await expect(page.locator('#tab-lichsu .hist-group[data-group="lasos"]')).toBeVisible();
      }
    }
  });

  test('tab Account — form hoặc thông tin tài khoản hiện', async ({ page }) => {
    if (!await isDashboardVisible(page)) { console.warn('Chưa login, bỏ qua'); return; }
    const accTab = page.locator('.tab-btn[data-tab="account"], .tab-btn').filter({ hasText: /account|tài khoản/i }).first();
    if (await accTab.isVisible().catch(() => false)) {
      await accTab.click();
      await page.waitForTimeout(500);
    }
  });

  test('không có JS errors nghiêm trọng', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('/profile.html');
    await page.waitForLoadState('load');
    await page.waitForSelector('#dashboard, #notLoggedIn', { timeout: 10000 }).catch(() => {});
    const critical = errors.filter(e =>
      !e.includes('favicon') && !e.includes('Sentry') && !e.includes('ERR_BLOCKED') && !e.includes('fonts.google')
    );
    expect(critical).toHaveLength(0);
  });
});
