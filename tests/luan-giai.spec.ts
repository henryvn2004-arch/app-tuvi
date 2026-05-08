import { test, expect } from '@playwright/test';

test.describe('Luận Giải Lá Số', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/luan-giai.html');
    await page.waitForLoadState('networkidle');
  });

  test('form render đủ fields', async ({ page }) => {
    await expect(page.locator('h1, .page-title')).toBeVisible();
    await expect(page.locator('input[name*="nam"], #namSinh').first()).toBeVisible();
  });

  test('submit → lá số grid 12 cung render', async ({ page }) => {
    const selects = page.locator('select');
    const count = await selects.count();
    for (let i = 0; i < count; i++) {
      const opts = await selects.nth(i).locator('option').allInnerTexts();
      if (opts.length > 1) await selects.nth(i).selectOption({ index: 1 });
    }
    await page.locator('input[name*="nam"], #namSinh').first().fill('1990');

    await page.locator('button[type="submit"], #btnAnalyze, button:has-text("Xem")').first().click();
    await page.waitForSelector('.palace, .cung, [class*="palace"]', { timeout: 20_000 });

    const palaces = page.locator('.palace, .cung, [class*="palace-cell"]');
    expect(await palaces.count()).toBeGreaterThanOrEqual(12);
  });

  test('paywall KHÔNG auto-popup', async ({ page }) => {
    let autoPopup = false;
    page.on('dialog', () => { autoPopup = true; });
    await page.locator('button[type="submit"], button:has-text("Xem")').first().click().catch(() => {});
    await page.waitForTimeout(2000);
    expect(autoPopup).toBe(false);
  });
});
