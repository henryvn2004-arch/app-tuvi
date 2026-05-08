import { test, expect } from '@playwright/test';

test.describe('Xem Tuoi Vo Chong', () => {
  test('page load + TuviForm render 2 panels', async ({ page }) => {
    await page.goto('/xem-tuoi.html');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.hero-tuoi')).toBeVisible();
    await expect(page.locator('#tuvi-form-a')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('#tuvi-form-b')).toBeVisible({ timeout: 5_000 });
  });

  test('submit #btn-analyze -> #result-section visible', async ({ page }) => {
    await page.goto('/xem-tuoi.html');
    await page.waitForLoadState('networkidle');

    await page.waitForFunction('typeof TuviForm !== "undefined"', { timeout: 10_000 });
    await page.evaluate(`
      TuviForm.setData({ hoten: 'Nguyen Van A', ngay: 15, thang: 7, nam: 1990, gioHour: 7, gioitinh: 'nam' }, 'a');
      TuviForm.setData({ hoten: 'Tran Thi B',   ngay: 10, thang: 3, nam: 1992, gioHour: 3, gioitinh: 'nu'  }, 'b');
      document.getElementById('nam-xem').value = '2026';
    `);

    await page.locator('#btn-analyze').click();
    await page.waitForSelector('#result-section:not([style*="display: none"])', { timeout: 25_000 });
  });
});
