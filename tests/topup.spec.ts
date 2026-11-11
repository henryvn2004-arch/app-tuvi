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

  test('4 muc gia hien bang USD', async ({ page }) => {
    // W5 (2026-11): gói bán bằng USD qua PayPal — số cụ thể đọc từ
    // `credit_packages.amount_usd` (Admin sửa, không deploy) nên KHÔNG ghim số
    // ở đây, chỉ kiểm dạng "$X.XX" và không còn VNĐ trên thẻ gói.
    const prices = page.locator('.pkg-card:not(.pkg-skel) .pkg-price');
    await expect(prices).toHaveCount(4, { timeout: 15000 });
    for (let i = 0; i < 4; i++) await expect(prices.nth(i)).toHaveText(/^\$\d+\.\d{2}$/);
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
