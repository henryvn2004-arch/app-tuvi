import { test, expect } from '@playwright/test';

test.describe('Luan Giai La So', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/luan-giai.html');
    await page.waitForLoadState('networkidle');
  });

  test('form render — TuviForm inject thanh cong', async ({ page }) => {
    // TuviForm renders vao #tuvi-form-container
    await expect(page.locator('#tuvi-form-container')).toBeVisible();
    // Submit button do TuviForm render
    const submit = page.locator('.btn-submit').first();
    await expect(submit).toBeVisible({ timeout: 8_000 });
    await expect(submit).toContainText('Luận Giải Lá Số');
  });

  test('submit -> #result-section active + #laso-grid 12 cung', async ({ page }) => {
    // Fill visible selects
    const selects = page.locator('select');
    const count = await selects.count();
    for (let i = 0; i < count; i++) {
      const sel = selects.nth(i);
      if (!await sel.isVisible()) continue;
      const opts = await sel.locator('option').allInnerTexts();
      if (opts.length > 1) await sel.selectOption({ index: 1 });
    }
    // Nam sinh input (TuviForm dung input type number)
    const namInput = page.locator('#tuvi-form-container input[type="number"]').first();
    if (await namInput.isVisible()) await namInput.fill('1990');

    // Click submit button
    await page.locator('.btn-submit').first().click();

    // result-section phai co class 'active'
    await page.waitForFunction(
      () => document.getElementById('result-section')?.classList.contains('active'),
      { timeout: 20_000 }
    );

    // Verify grid co 12 cung cells
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
