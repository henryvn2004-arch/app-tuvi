import { test, expect } from '@playwright/test';

// Gap hiện tại: tu-binh.spec.ts chỉ test paywall regression, chưa test kết quả thực

// Helper: setData + click submit + chờ result hoặc error
async function submitTuBinh(page: any) {
  await page.waitForFunction('typeof TuviForm !== "undefined"', { timeout: 10_000 });
  await page.evaluate(`
    TuviForm.setData({ hoten: 'Test Tubinh', ngay: 15, thang: 7, nam: 1990, gioHour: 7, gioitinh: 'nam', namXem: 2026 })
  `);
  // TuviForm generates #tvf-submit-btn
  await page.locator('#tvf-submit-btn').click();
  // Chờ result-section hoặc error-msg show (AI call có thể mất 30-90s)
  await page.waitForFunction(
    `document.querySelector('#result-section')?.style.display !== 'none' ||
     document.querySelector('#error-msg')?.classList.contains('show')`,
    { timeout: 90_000 }
  );
}

test.describe('Tử Bình — Submit & Result', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tu-binh.html');
    await page.waitForLoadState('networkidle');
  });

  test('form container inject thành công', async ({ page }) => {
    await expect(page.locator('#tubinh-form-container')).toBeVisible({ timeout: 8000 });
    await page.waitForFunction(
      'document.querySelectorAll("#tubinh-form-container input, #tubinh-form-container select").length > 0',
      { timeout: 10_000 }
    );
  });

  test('submit button #tvf-submit-btn hiện', async ({ page }) => {
    await page.waitForFunction('typeof TuviForm !== "undefined"', { timeout: 10_000 });
    await expect(page.locator('#tvf-submit-btn')).toBeVisible({ timeout: 8000 });
  });

  test('submit → result-section hoặc error-msg hiện (không treo)', async ({ page }) => {
    test.setTimeout(120_000);
    await submitTuBinh(page);

    const resultVisible = await page.locator('#result-section').evaluate(
      (el: HTMLElement) => el.style.display !== 'none'
    ).catch(() => false);
    const errorVisible = await page.locator('#error-msg.show').isVisible().catch(() => false);
    expect(resultVisible || errorVisible).toBe(true);
  });

  test('nếu result hiện — result-header và tutru-table có nội dung', async ({ page }) => {
    test.setTimeout(120_000);
    await submitTuBinh(page);

    const resultVisible = await page.locator('#result-section').evaluate(
      (el: HTMLElement) => el.style.display !== 'none'
    ).catch(() => false);
    if (!resultVisible) { console.warn('Result không hiện (có thể thiếu credits)'); return; }

    await expect(page.locator('#result-header')).not.toBeEmpty({ timeout: 5000 });
    const table = page.locator('#tutru-table');
    if (await table.isVisible().catch(() => false)) {
      expect(await table.locator('tr').count()).toBeGreaterThanOrEqual(1);
    }
  });

  test('nếu result hiện — mục lục ít nhất 3 mục', async ({ page }) => {
    test.setTimeout(120_000);
    await submitTuBinh(page);

    const resultVisible = await page.locator('#result-section').evaluate(
      (el: HTMLElement) => el.style.display !== 'none'
    ).catch(() => false);
    if (!resultVisible) { console.warn('Result không hiện (có thể thiếu credits)'); return; }

    const mucLuc = page.locator('#muc-luc-items .muc-luc-btn, [id^="ml-"]');
    expect(await mucLuc.count()).toBeGreaterThanOrEqual(3);
  });

  test('paywall KHÔNG auto-popup khi submit', async ({ page }) => {
    const dialogs: string[] = [];
    page.on('dialog', d => { dialogs.push(d.message()); d.dismiss(); });

    await page.waitForFunction('typeof TuviForm !== "undefined"', { timeout: 10_000 });
    await page.evaluate(`
      TuviForm.setData({ hoten: 'Test User', ngay: 15, thang: 7, nam: 1990, gioHour: 7, gioitinh: 'nam', namXem: 2026 })
    `);
    await page.locator('#tvf-submit-btn').click();
    await page.waitForTimeout(5000);

    expect(dialogs).toHaveLength(0);
    const modal = await page.locator('.tuvi-paywall-modal,[class*="paywall-modal"]').isVisible({ timeout: 500 }).catch(() => false);
    expect(modal).toBe(false);
  });
});
