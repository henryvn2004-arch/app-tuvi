import { test, expect } from '@playwright/test';

test.describe('Luan Giai La So', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/luan-giai.html');
    await page.waitForLoadState('networkidle');
  });

  test('form render — TuviForm inject thanh cong', async ({ page }) => {
    await expect(page.locator('#tuvi-form-container')).toBeVisible();
    const submit = page.locator('.btn-submit').first();
    await expect(submit).toBeVisible({ timeout: 8_000 });
    await expect(submit).toContainText('Luận Giải Lá Số');
  });

  test('submit -> #result-section active + #laso-grid 12 cung', async ({ page }) => {
    // Cho TuviForm load xong
    await page.waitForFunction(() => typeof (window as any).TuviForm !== 'undefined' && typeof (window as any).TuviForm.setData === 'function', { timeout: 10_000 });

    await page.evaluate(() => {
      (window as any).TuviForm.setData({
        hoten: 'Playwright Test', ngay: 15, thang: 7, nam: 1990,
        gioHour: 7, gioPhut: 0, gioitinh: 'nam', namXem: 2026
      });
    });

    await page.locator('.btn-submit').first().click();
    await page.waitForSelector('#result-section.active', { timeout: 20_000 });

    const cells = page.locator('#laso-grid .cung-cell');
    expect(await cells.count()).toBeGreaterThanOrEqual(12);
  });

  test('paywall KHONG auto-popup', async ({ page }) => {
    let pop = false;
    page.on('dialog', () => { pop = true; });
    await page.waitForTimeout(2000);
    expect(pop).toBe(false);
  });
});
