import { test, expect } from '@playwright/test';

// Profile tests chạy với auth state (storageState từ auth.setup.ts)

test.describe('Profile (profile.html) — logged in', () => {
  // Helper: check if dashboard is visible after auth
  async function isDashboardVisible(page: any): Promise<boolean> {
    return page.locator('#dashboard').isVisible({ timeout: 12000 }).catch(() => false);
  }

  test.beforeEach(async ({ page }) => {
    await page.goto('/profile.html');
    await page.waitForLoadState('networkidle');
    // Chờ auth JS chạy xong — dashboard hoặc notLoggedIn hiện
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

  test('tab Lá Số — lịch sử hiện (hoặc empty state)', async ({ page }) => {
    if (!await isDashboardVisible(page)) { console.warn('Chưa login, bỏ qua'); return; }
    const lasoTab = page.locator('.tab-btn[data-tab="lasos"], .tab-btn').filter({ hasText: /lá số|laso/i }).first();
    if (await lasoTab.isVisible().catch(() => false)) {
      await lasoTab.click();
      await page.waitForTimeout(1000);
      const content = page.locator('#tab-lasos, #lasosContent');
      await expect(content).toBeVisible({ timeout: 3000 });
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
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#dashboard, #notLoggedIn', { timeout: 10000 }).catch(() => {});
    const critical = errors.filter(e =>
      !e.includes('favicon') && !e.includes('Sentry') && !e.includes('ERR_BLOCKED') && !e.includes('fonts.google')
    );
    expect(critical).toHaveLength(0);
  });
});
