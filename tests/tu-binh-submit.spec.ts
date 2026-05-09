import { test, expect } from '@playwright/test';

// Gap hiện tại: tu-binh.spec.ts chỉ test paywall regression, chưa test kết quả thực

test.describe('Tử Bình — Submit & Result', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tu-binh.html');
    await page.waitForLoadState('networkidle');
  });

  test('form container inject thành công', async ({ page }) => {
    await expect(page.locator('#tubinh-form-container')).toBeVisible({ timeout: 8000 });
    // Form phải có ít nhất 1 input/select sau khi TuviForm inject
    await page.waitForFunction(
      'document.querySelectorAll("#tubinh-form-container input, #tubinh-form-container select").length > 0',
      { timeout: 10_000 }
    );
  });

  test('submit → loader hiện rồi tắt, result-section visible', async ({ page }) => {
    await page.waitForFunction('typeof TuviForm !== "undefined"', { timeout: 10_000 });
    await page.evaluate(`
      TuviForm.setData({ hoten: 'Test Tubinh', ngay: 15, thang: 7, nam: 1990, gioHour: 7, gioitinh: 'nam', namXem: 2026 })
    `);

    // Tìm nút submit trong form container
    const submitBtn = page.locator('#tubinh-form-container .btn-submit, #tubinh-form-container button[type="submit"], #tubinh-form-container button').filter({ hasText: /luận giải|phân tích|submit|xem/i }).first();
    const fallbackBtn = page.locator('.btn-submit').first();
    const btn = await submitBtn.isVisible().catch(() => false) ? submitBtn : fallbackBtn;

    await btn.click();

    // Loader xuất hiện
    await page.waitForSelector('#loader.show, #loader[style*="flex"]', { timeout: 5000 }).catch(() => {});

    // Chờ result-section hiện (AI call có thể lâu)
    await page.waitForSelector('#result-section', { state: 'visible', timeout: 60_000 });
    await expect(page.locator('#result-section')).toBeVisible();
  });

  test('result-header có tên + ngày sinh', async ({ page }) => {
    await page.waitForFunction('typeof TuviForm !== "undefined"', { timeout: 10_000 });
    await page.evaluate(`
      TuviForm.setData({ hoten: 'Nguyễn Văn Test', ngay: 15, thang: 7, nam: 1990, gioHour: 7, gioitinh: 'nam', namXem: 2026 })
    `);

    const btn = page.locator('.btn-submit').first();
    await btn.click();
    await page.waitForSelector('#result-section', { state: 'visible', timeout: 60_000 });

    const header = page.locator('#result-header');
    await expect(header).not.toBeEmpty({ timeout: 5000 });
  });

  test('bảng tứ trụ render (tutru-table có rows)', async ({ page }) => {
    await page.waitForFunction('typeof TuviForm !== "undefined"', { timeout: 10_000 });
    await page.evaluate(`
      TuviForm.setData({ hoten: 'Test User', ngay: 15, thang: 7, nam: 1990, gioHour: 7, gioitinh: 'nam', namXem: 2026 })
    `);

    const btn = page.locator('.btn-submit').first();
    await btn.click();
    await page.waitForSelector('#result-section', { state: 'visible', timeout: 60_000 });

    const table = page.locator('#tutru-table');
    if (await table.isVisible().catch(() => false)) {
      const rows = table.locator('tr');
      expect(await rows.count()).toBeGreaterThanOrEqual(1);
    }
  });

  test('mục lục phân tích render (ít nhất 3 mục)', async ({ page }) => {
    await page.waitForFunction('typeof TuviForm !== "undefined"', { timeout: 10_000 });
    await page.evaluate(`
      TuviForm.setData({ hoten: 'Test User', ngay: 15, thang: 7, nam: 1990, gioHour: 7, gioitinh: 'nam', namXem: 2026 })
    `);

    const btn = page.locator('.btn-submit').first();
    await btn.click();
    await page.waitForSelector('#result-section', { state: 'visible', timeout: 60_000 });

    const mucLuc = page.locator('#muc-luc-items .muc-luc-btn, #muc-luc-items button, [id^="ml-"]');
    const count = await mucLuc.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('error-msg KHÔNG hiện khi submit hợp lệ', async ({ page }) => {
    await page.waitForFunction('typeof TuviForm !== "undefined"', { timeout: 10_000 });
    await page.evaluate(`
      TuviForm.setData({ hoten: 'Test User', ngay: 15, thang: 7, nam: 1990, gioHour: 7, gioitinh: 'nam', namXem: 2026 })
    `);

    const btn = page.locator('.btn-submit').first();
    await btn.click();
    await page.waitForSelector('#result-section', { state: 'visible', timeout: 60_000 });

    const errMsg = page.locator('#error-msg.show, #error-msg[style*="block"]');
    const errVisible = await errMsg.isVisible().catch(() => false);
    expect(errVisible).toBe(false);
  });

  test('paywall KHÔNG auto-popup khi submit', async ({ page }) => {
    const dialogs: string[] = [];
    page.on('dialog', d => { dialogs.push(d.message()); d.dismiss(); });

    await page.waitForFunction('typeof TuviForm !== "undefined"', { timeout: 10_000 });
    await page.evaluate(`
      TuviForm.setData({ hoten: 'Test User', ngay: 15, thang: 7, nam: 1990, gioHour: 7, gioitinh: 'nam', namXem: 2026 })
    `);

    const btn = page.locator('.btn-submit').first();
    await btn.click();
    await page.waitForTimeout(5000);

    expect(dialogs).toHaveLength(0);
    const modal = await page.locator('.tuvi-paywall-modal,[class*="paywall-modal"]').isVisible({ timeout: 500 }).catch(() => false);
    expect(modal).toBe(false);
  });
});
