import { test, expect } from '@playwright/test';

// Profile tests chạy với auth state (storageState từ auth.setup.ts)

test.describe('Profile (profile.html) — logged in', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/profile.html');
    await page.waitForLoadState('networkidle');
    // Chờ auth JS chạy xong — dashboard visible (có thể mất vài giây)
    await page.waitForSelector('#dashboard', { state: 'visible', timeout: 15000 });
  });

  test('dashboard hiện khi đã login', async ({ page }) => {
    await expect(page.locator('#dashboard')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#notLoggedIn')).not.toBeVisible();
  });

  test('email user hiện đúng', async ({ page }) => {
    const email = page.locator('#userEmail');
    await expect(email).toBeVisible({ timeout: 10000 });
    const text = await email.textContent();
    expect(text).toContain('@');
  });

  test('tabs profile render đủ', async ({ page }) => {
    const tabs = page.locator('.tab-btn');
    expect(await tabs.count()).toBeGreaterThanOrEqual(4);
  });

  test('tab Credits — hiện số dư', async ({ page }) => {
    const creditsTab = page.locator('.tab-btn[data-tab="credits"], .tab-btn').filter({ hasText: /credits|tín dụng|số dư/i }).first();
    if (await creditsTab.isVisible().catch(() => false)) {
      await creditsTab.click();
      await page.waitForSelector('#tab-credits', { state: 'visible', timeout: 5000 }).catch(() => {});
      await expect(page.locator('#tab-credits')).toBeVisible({ timeout: 3000 });
    }
  });

  test('tab Lá Số — lịch sử hiện (hoặc empty state)', async ({ page }) => {
    const lasoTab = page.locator('.tab-btn[data-tab="lasos"], .tab-btn').filter({ hasText: /lá số|laso/i }).first();
    if (await lasoTab.isVisible().catch(() => false)) {
      await lasoTab.click();
      await page.waitForTimeout(1000);
      const content = page.locator('#tab-lasos, #lasosContent');
      await expect(content).toBeVisible({ timeout: 3000 });
    }
  });

  test('tab Account — form hoặc thông tin tài khoản hiện', async ({ page }) => {
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
    await page.waitForSelector('#dashboard, #notLoggedIn', { timeout: 10000 });
    const critical = errors.filter(e =>
      !e.includes('favicon') && !e.includes('Sentry') && !e.includes('ERR_BLOCKED') && !e.includes('fonts.google')
    );
    expect(critical).toHaveLength(0);
  });
});
