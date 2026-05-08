import { test, expect } from '@playwright/test';

test.describe('Xem Tuổi Vợ Chồng', () => {
  test('page load + 2 form panels', async ({ page }) => {
    await page.goto('/xem-tuoi.html');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1, .page-title')).toBeVisible();
    const namFields = page.locator('input[name*="nam"], input[placeholder*="năm"]');
    expect(await namFields.count()).toBeGreaterThanOrEqual(2);
  });

  test('submit → result render', async ({ page }) => {
    await page.goto('/xem-tuoi.html');
    const namFields = page.locator('input[name*="nam"], input[placeholder*="năm"]');
    if (await namFields.count() >= 2) {
      await namFields.nth(0).fill('1990');
      await namFields.nth(1).fill('1992');
    }
    await page.locator('button[type="submit"], button:has-text("Xem"), button:has-text("Phân Tích")').first().click();
    await expect(page.locator('.result, .result-section, [class*="section"], #result').first()).toBeVisible({ timeout: 20_000 });
  });
});
