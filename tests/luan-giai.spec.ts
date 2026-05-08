import { test, expect } from '@playwright/test';

test.describe('Luan Giai La So', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/luan-giai.html');
    await page.waitForLoadState('networkidle');
  });

  test('form render', async ({ page }) => {
    await expect(page.locator('h1, h2, h3, .form-container, form, #tuviForm').first()).toBeVisible();
    await expect(page.locator('select').first()).toBeAttached();
  });

  test.skip('submit -> grid render (todo: can HTML de lay selector chinh xac)', async ({ page }) => {
    // Can xem HTML thuc te cua /luan-giai.html de biet submit button ID va grid class
  });

  test('paywall KHONG auto-popup', async ({ page }) => {
    let pop = false;
    page.on('dialog', () => { pop = true; });
    await page.waitForTimeout(2000);
    expect(pop).toBe(false);
  });
});
