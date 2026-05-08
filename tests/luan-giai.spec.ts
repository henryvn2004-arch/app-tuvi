import { test, expect } from '@playwright/test';

test.describe('Luan Giai La So', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/luan-giai.html');
    await page.waitForLoadState('networkidle');
  });

  test('form render', async ({ page }) => {
    await expect(page.locator('h1, h2, h3, .form-container, form, #tuviForm').first()).toBeVisible();
    await expect(page.locator('select').first()).toBeAttached();
  });

  test('submit -> la so grid 12 cung', async ({ page }) => {
    await fillVisibleSelects(page);
    const submit = page.locator(
      '#tvf-submit, .btn-analyze, button[onclick*="analyz"], ' +
      'button:has-text("An Sao"), button:has-text("Lap La"), button:has-text("Xem La"), ' +
      'button:has-text("Luan Giai"), button[type="submit"]'
    ).first();
    await expect(submit).toBeVisible({ timeout: 5_000 });
    await submit.click();
    await page.waitForSelector('.palace, .cung, [class*="palace"], td[class*="cung"]', { timeout: 20_000 });
    const palaces = page.locator('.palace, .cung, [class*="palace"], td[class*="cung"]');
    expect(await palaces.count()).toBeGreaterThanOrEqual(12);
  });

  test('paywall KHONG auto-popup', async ({ page }) => {
    let autoPopup = false;
    page.on('dialog', () => { autoPopup = true; });
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
