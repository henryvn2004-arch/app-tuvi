import { test, expect } from '@playwright/test';

// Gap hiện tại: xem-lam-an.spec.ts chỉ test page load, chưa test submit

test.describe('Xem Tuổi Làm Ăn — Submit & Result', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/xem-lam-an.html');
    await page.waitForLoadState('networkidle');
    await page.waitForFunction('typeof TuviForm !== "undefined"', { timeout: 10_000 });
  });

  test('hai form panels hiện (tuvi-form-a và tuvi-form-b)', async ({ page }) => {
    await expect(page.locator('#tuvi-form-a')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('#tuvi-form-b')).toBeVisible({ timeout: 8000 });
  });

  test('nút Phân Tích Tương Quan hiện', async ({ page }) => {
    await expect(page.locator('#btn-analyze')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('#btn-analyze')).toContainText('Phân Tích');
  });

  test('submit → #result-section visible (kết quả hoặc error rõ ràng)', async ({ page }) => {
    await page.evaluate(`
      TuviForm.setData({ hoten: 'Nguyen Van A', ngay: 15, thang: 7, nam: 1980, gioHour: 7, gioitinh: 'nam' }, 'a');
      TuviForm.setData({ hoten: 'Tran Van B',   ngay: 10, thang: 3, nam: 1975, gioHour: 3, gioitinh: 'nam' }, 'b');
    `);

    const namXem = page.locator('#nam-xem');
    if (await namXem.isVisible().catch(() => false)) {
      await namXem.fill('2026');
    }

    await page.locator('#btn-analyze').click();

    // result-section phải hiện (display != none)
    await page.waitForSelector('#result-section:not([style*="display: none"])', { timeout: 30_000 });
    await expect(page.locator('#result-section')).toBeVisible();
  });

  test('kết quả có nội dung — không rỗng', async ({ page }) => {
    await page.evaluate(`
      TuviForm.setData({ hoten: 'Nguyen Van A', ngay: 15, thang: 7, nam: 1980, gioHour: 7, gioitinh: 'nam' }, 'a');
      TuviForm.setData({ hoten: 'Tran Van B',   ngay: 10, thang: 3, nam: 1975, gioHour: 3, gioitinh: 'nam' }, 'b');
    `);

    const namXem = page.locator('#nam-xem');
    if (await namXem.isVisible().catch(() => false)) {
      await namXem.fill('2026');
    }

    await page.locator('#btn-analyze').click();
    await page.waitForSelector('#result-section:not([style*="display: none"])', { timeout: 30_000 });

    const resultText = await page.locator('#result-section').textContent();
    expect(resultText?.trim().length).toBeGreaterThan(20);
  });

  test('paywall KHÔNG auto-popup khi submit', async ({ page }) => {
    const dialogs: string[] = [];
    page.on('dialog', d => { dialogs.push(d.message()); d.dismiss(); });

    await page.evaluate(`
      TuviForm.setData({ hoten: 'Test A', ngay: 15, thang: 7, nam: 1980, gioHour: 7, gioitinh: 'nam' }, 'a');
      TuviForm.setData({ hoten: 'Test B', ngay: 10, thang: 3, nam: 1975, gioHour: 3, gioitinh: 'nam' }, 'b');
    `);

    await page.locator('#btn-analyze').click();
    await page.waitForTimeout(5000);

    expect(dialogs).toHaveLength(0);
    const modal = await page.locator('.tuvi-paywall-modal,[class*="paywall-modal"]').isVisible({ timeout: 500 }).catch(() => false);
    expect(modal).toBe(false);
  });

  test('không có JS errors nghiêm trọng khi submit', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

    await page.evaluate(`
      TuviForm.setData({ hoten: 'Test A', ngay: 15, thang: 7, nam: 1980, gioHour: 7, gioitinh: 'nam' }, 'a');
      TuviForm.setData({ hoten: 'Test B', ngay: 10, thang: 3, nam: 1975, gioHour: 3, gioitinh: 'nam' }, 'b');
    `);

    await page.locator('#btn-analyze').click();
    await page.waitForSelector('#result-section:not([style*="display: none"])', { timeout: 30_000 }).catch(() => {});

    const critical = errors.filter(e =>
      !e.includes('favicon') && !e.includes('Sentry') && !e.includes('ERR_BLOCKED') && !e.includes('fonts.google')
    );
    expect(critical).toHaveLength(0);
  });
});
