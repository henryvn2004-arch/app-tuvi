import { test, expect } from '@playwright/test';

test.describe('Luận Giải Lá Số', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/luan-giai.html');
    await page.waitForLoadState('networkidle');
  });

  test('form render đủ fields', async ({ page }) => {
    // Page này dùng TuviForm — title có thể là .tool-title, .form-title, hoặc section heading
    const hasTitle = await page.locator('h1, h2, h3, .tool-title, .form-title, .section-title').first().isVisible();
    expect(hasTitle).toBe(true);

    // Năm sinh
    const namInput = page.locator('input[name*="nam"], #namSinh, input.year-input').first();
    await expect(namInput).toBeVisible();
  });

  test('submit → lá số grid 12 cung render', async ({ page }) => {
    await fillVisibleSelects(page);
    await page.locator('input[name*="nam"], #namSinh').first().fill('1990');
    await page.locator('button[type="submit"], #btnAnalyze, button:has-text("Xem"), button:has-text("Lập")').first().click();
    await page.waitForSelector('.palace, .cung, [class*="palace"], td.palace-cell', { timeout: 20_000 });
    const palaces = page.locator('.palace, .cung, [class*="palace-cell"], td.palace-cell');
    expect(await palaces.count()).toBeGreaterThanOrEqual(12);
  });

  test('paywall KHÔNG auto-popup', async ({ page }) => {
    let autoPopup = false;
    page.on('dialog', () => { autoPopup = true; });
    await page.locator('button[type="submit"], button:has-text("Xem")').first().click().catch(() => {});
    await page.waitForTimeout(2000);
    expect(autoPopup).toBe(false);
  });
});

async function fillVisibleSelects(page: any) {
  const selects = page.locator('select');
  const count = await selects.count();
  for (let i = 0; i < count; i++) {
    const sel = selects.nth(i);
    if (!await sel.isVisible()) continue;
    const opts = await sel.locator('option').allInnerTexts();
    if (opts.length > 1) await sel.selectOption({ index: 1 });
  }
}
