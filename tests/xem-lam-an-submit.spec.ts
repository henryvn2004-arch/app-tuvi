import { test, expect } from '@playwright/test';

// 2026-09-19: retire /xem-lam-an.html → shell /app/xem-lam-an (public/app-xem-tuoi.html,
// dùng chung file với /app/xem-tuoi qua MODE_KEY). DOM khác bản standalone cũ:
// #tuvi-form-a/#tuvi-form-b/#btn-analyze/#result-section/#nam-xem
// → #a-fields/#b-fields/#btnGo/#xtPanel (data-ws-result) — không còn field
// "năm xem" (calcTuongHop không nhận tham số năm).

test.describe('Xem Tuổi Làm Ăn — Submit & Result (shell /app/xem-lam-an)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app/xem-lam-an');
    await page.waitForLoadState('networkidle');
    await page.waitForFunction('typeof TuviForm !== "undefined"', { timeout: 10_000 });
  });

  test('hai form panels hiện (a-fields và b-fields)', async ({ page }) => {
    await expect(page.locator('#a-fields')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('#b-fields')).toBeVisible({ timeout: 8000 });
  });

  test('nút xét hợp tác (#btnGo) hiện', async ({ page }) => {
    await expect(page.locator('#btnGo')).toBeVisible({ timeout: 8000 });
  });

  test('submit → #xtPanel visible (kết quả hoặc error rõ ràng)', async ({ page }) => {
    await page.evaluate(`
      TuviForm.setData({ hoten: 'Nguyen Van A', ngay: 15, thang: 7, nam: 1980, gioHour: 7, gioitinh: 'nam' }, 'a');
      TuviForm.setData({ hoten: 'Tran Van B',   ngay: 10, thang: 3, nam: 1975, gioHour: 3, gioitinh: 'nam' }, 'b');
    `);

    await page.locator('#btnGo').click();

    // #xtPanel phải hiện (display != none)
    await page.waitForFunction(
      `getComputedStyle(document.querySelector('#xtPanel')).display !== 'none'`,
      { timeout: 30_000 }
    );
    await expect(page.locator('#xtPanel')).toBeVisible();
  });

  test('kết quả có nội dung — không rỗng', async ({ page }) => {
    await page.evaluate(`
      TuviForm.setData({ hoten: 'Nguyen Van A', ngay: 15, thang: 7, nam: 1980, gioHour: 7, gioitinh: 'nam' }, 'a');
      TuviForm.setData({ hoten: 'Tran Van B',   ngay: 10, thang: 3, nam: 1975, gioHour: 3, gioitinh: 'nam' }, 'b');
    `);

    await page.locator('#btnGo').click();
    await page.waitForFunction(
      `getComputedStyle(document.querySelector('#xtPanel')).display !== 'none'`,
      { timeout: 30_000 }
    );

    const resultText = await page.locator('#xtPanel').textContent();
    expect(resultText?.trim().length).toBeGreaterThan(20);
  });

  test('paywall KHÔNG auto-popup khi submit', async ({ page }) => {
    const dialogs: string[] = [];
    page.on('dialog', d => { dialogs.push(d.message()); d.dismiss(); });

    await page.evaluate(`
      TuviForm.setData({ hoten: 'Test A', ngay: 15, thang: 7, nam: 1980, gioHour: 7, gioitinh: 'nam' }, 'a');
      TuviForm.setData({ hoten: 'Test B', ngay: 10, thang: 3, nam: 1975, gioHour: 3, gioitinh: 'nam' }, 'b');
    `);

    await page.locator('#btnGo').click();
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

    await page.locator('#btnGo').click();
    await page.waitForFunction(
      `getComputedStyle(document.querySelector('#xtPanel')).display !== 'none'`,
      { timeout: 30_000 }
    ).catch(() => {});

    const critical = errors.filter(e =>
      !e.includes('favicon') && !e.includes('Sentry') && !e.includes('ERR_BLOCKED') && !e.includes('fonts.google')
    );
    expect(critical).toHaveLength(0);
  });
});
