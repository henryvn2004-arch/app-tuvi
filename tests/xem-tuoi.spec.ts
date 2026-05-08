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

    // Fill ca 2 forms qua TuviForm API
    await page.evaluate(() => {
      const TF = (window as any).TuviForm;
      TF.setData({ hoten: 'Nguyen Van A', ngay: 15, thang: 7, nam: 1990, gioHour: 7, gioitinh: 'nam' }, 'a');
      TF.setData({ hoten: 'Tran Thi B',   ngay: 10, thang: 3, nam: 1992, gioHour: 3, gioitinh: 'nu'  }, 'b');
      const namXem = document.getElementById('nam-xem') as HTMLInputElement;
      if (namXem) namXem.value = '2026';
    });

    const btn = page.locator('#btn-analyze');
    await expect(btn).toBeVisible({ timeout: 5_000 });
    await btn.click();

    // #result-section: display:none -> display:block sau khi analyze() chay
    await page.waitForSelector('#result-section:not([style*="display: none"])', { timeout: 25_000 });
    console.log('result-section visible');
  });
});
