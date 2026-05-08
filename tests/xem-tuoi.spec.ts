import { test, expect } from '@playwright/test';

test.describe('Xem Tuoi Vo Chong', () => {
  test('page load + form visible', async ({ page }) => {
    await page.goto('/xem-tuoi.html');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1, h2, .page-title').first()).toBeVisible();
    expect(await page.locator('select').count()).toBeGreaterThanOrEqual(2);
  });

  test('submit -> result-section visible', async ({ page }) => {
    await page.goto('/xem-tuoi.html');
    await page.waitForLoadState('networkidle');

    const selects = page.locator('select');
    const count = await selects.count();
    for (let i = 0; i < count; i++) {
      const sel = selects.nth(i);
      if (!await sel.isVisible()) continue;
      const opts = await sel.locator('option').allInnerTexts();
      if (opts.length > 1) await sel.selectOption({ index: 1 });
    }

    await page.locator(
      'button[type="submit"], button:has-text("Xem"), button:has-text("Phan Tich"), .btn-analyze'
    ).first().click();

    // #result-section bat dau display:none, sau submit phai visible
    await page.waitForFunction(
      () => {
        const el = document.querySelector('#result-section, #resultSection, #result, .result-container');
        if (!el) return false;
        return window.getComputedStyle(el).display !== 'none';
      },
      { timeout: 25_000 }
    );
  });
});
