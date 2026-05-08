import { test, expect } from '@playwright/test';

test.describe('Topup Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/topup.html');
    await page.waitForLoadState('networkidle');
  });

  test('4 packages render', async ({ page }) => {
    const cards = page.locator('.package-card, .topup-card, [class*="package"], [class*="plan"]');
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBe(4);
  });

  test('package names đúng', async ({ page }) => {
    for (const name of ['Khởi Đầu', 'Phổ Thông', 'Cao Cấp', 'VIP']) {
      await expect(page.locator(`text=${name}`).first()).toBeVisible();
    }
  });

  test('buy button → QR modal', async ({ page }) => {
    await page.locator('button:has-text("Chuyển Khoản"), button:has-text("Nạp"), button:has-text("Mua"), .btn-buy').first().click();
    const modal = page.locator('.qr-modal, [class*="qr"], .modal:visible, [class*="bank"]').first();
    await expect(modal).toBeVisible({ timeout: 5_000 });
    const close = modal.locator('button:has-text("Đóng"), .btn-close, .close-btn').first();
    if (await close.isVisible()) await close.click();
    else await page.keyboard.press('Escape');
  });
});
