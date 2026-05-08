import { test, expect } from '@playwright/test';

test.describe('Xem Tuổi Làm Ăn', () => {
  test('page load OK', async ({ page }) => {
    await page.goto('/xem-lam-an.html');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1, .page-title')).toBeVisible();
    await expect(page.locator('h1, .page-title')).toContainText(/Làm Ăn|làm ăn/i);
  });

  test('slug là xem-lam-an (không nhầm xem-tuoi)', async ({ page }) => {
    await page.goto('/xem-lam-an.html');
    const content = await page.content();
    expect(content).toContain('xem-lam-an');
  });
});
