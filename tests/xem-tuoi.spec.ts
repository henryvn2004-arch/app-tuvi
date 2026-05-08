import { test, expect } from '@playwright/test';

test.describe('Xem Tuổi Vợ Chồng', () => {
  test('page load + form visible', async ({ page }) => {
    await page.goto('/xem-tuoi.html');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1, h2, .page-title, .tool-title').first()).toBeVisible();

    // Dùng select year thay vì input text (xem-tuoi dùng <select> cho năm sinh)
    const yearSelects = page.locator('select[name*="nam"], select[id*="nam"], select[name*="year"]');
    const yearCount = await yearSelects.count();
    if (yearCount < 2) {
      // Fallback: kiểm tra ít nhất có 2 select elements (cho 2 người)
      const allSelects = page.locator('select');
      expect(await allSelects.count()).toBeGreaterThanOrEqual(2);
    } else {
      expect(yearCount).toBeGreaterThanOrEqual(2);
    }
  });

  test('submit → result render', async ({ page }) => {
    await page.goto('/xem-tuoi.html');
    await page.waitForLoadState('networkidle');

    // Fill tất cả visible selects
    const selects = page.locator('select');
    const count = await selects.count();
    for (let i = 0; i < count; i++) {
      const sel = selects.nth(i);
      if (!await sel.isVisible()) continue;
      const opts = await sel.locator('option').allInnerTexts();
      if (opts.length > 1) await sel.selectOption({ index: 1 });
    }

    await page.locator(
      'button[type="submit"], button:has-text("Xem"), button:has-text("Phân Tích"), button:has-text("Tính")'
    ).first().click();

    // Chờ result — tránh match nav elements bằng cách exclude nav
    await page.waitForTimeout(2000);
    const resultArea = page.locator(
      '#result, #resultArea, .result-container, .analysis-result, .xem-tuoi-result, ' +
      '.score-result, [id*="result"]:not([id*="nav"])'
    ).first();
    await expect(resultArea).toBeVisible({ timeout: 20_000 });
  });
});
