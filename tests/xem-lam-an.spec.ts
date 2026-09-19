import { test, expect } from '@playwright/test';

// 2026-09-19: retire /xem-lam-an.html → shell /app/xem-lam-an (public/app-xem-tuoi.html,
// dùng chung file với /app/xem-tuoi qua MODE_KEY — location.pathname chứa 'lam-an').

test.describe('Xem Tuổi Làm Ăn (shell /app/xem-lam-an)', () => {
  test('page load OK', async ({ page }) => {
    await page.goto('/app/xem-lam-an');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#wsTitle')).toBeVisible();
    await expect(page.locator('#wsTitle')).toContainText(/Làm Ăn|làm ăn/i);
  });

  test('MODE_KEY là xem-lam-an (không nhầm xem-tuoi)', async ({ page }) => {
    await page.goto('/app/xem-lam-an');
    await page.waitForFunction('typeof MODE_KEY !== "undefined"', { timeout: 10_000 });
    const mode = await page.evaluate(() => (window as unknown as { MODE_KEY: string }).MODE_KEY);
    expect(mode).toBe('xem-lam-an');
  });
});
