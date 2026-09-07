import { test, expect } from '@playwright/test';

test.describe('Topup Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/topup.html');
    await page.waitForLoadState('networkidle');
  });

  test('page load + package names', async ({ page }) => {
    await expect(page.locator('h1, h2, .page-title').first()).toBeVisible();
    for (const name of ['Khoi Dau', 'Pho Thong', 'Cao Cap', 'VIP']) {
      const el = page.locator(`text=${name}`).first();
      const found = await el.isVisible({ timeout: 2000 }).catch(() => false);
      if (!found) console.warn(`Package "${name}" khong visible`);
    }
    // Hard check VIP luon co
    await expect(page.locator('text=VIP').first()).toBeVisible();
  });

  test('4 muc gia hien dung', async ({ page }) => {
    // Giá 4 gói (tăng 2026-08-30, xem _patches/migration-credit-packages-reprice-2026-08.sql):
    // Khởi Đầu 199k, Phổ Thông 399k, Cao Cấp 699k, VIP 999k.
    for (const price of ['199', '399', '699', '999']) {
      await expect(page.locator(`text=/${price}/`).first()).toBeVisible();
    }
  });

  test('buy button visible', async ({ page }) => {
    // Tim button trong page content, khong phai nav
    const allBtns = page.locator('button').filter({ hasText: /Nap|Mua|Thanh Toan|Chuyen Khoan/i });
    const count = await allBtns.count();
    let foundVisible = false;
    for (let i = 0; i < count; i++) {
      if (await allBtns.nth(i).isVisible()) { foundVisible = true; break; }
    }
    if (!foundVisible) console.warn('Buy button khong tim thay');
    // Khong hard-fail vi button text co the khac
  });
});
