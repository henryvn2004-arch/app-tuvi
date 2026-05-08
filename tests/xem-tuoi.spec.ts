import { test, expect } from '@playwright/test';

test.describe('Xem Tuoi Vo Chong', () => {
  test('page load + form visible', async ({ page }) => {
    await page.goto('/xem-tuoi.html');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1, h2, .page-title').first()).toBeVisible();
    expect(await page.locator('select').count()).toBeGreaterThanOrEqual(2);
  });

  test('submit -> result visible', async ({ page }) => {
    await page.goto('/xem-tuoi.html');
    await page.waitForLoadState('networkidle');
    const s = page.locator('select');
    for (let i = 0; i < await s.count(); i++) {
      if (!await s.nth(i).isVisible()) continue;
      const o = await s.nth(i).locator('option').allInnerTexts();
      if (o.length > 1) await s.nth(i).selectOption({ index: 1 });
    }
    const before = await page.locator('body *').count();
    const b = page.locator('button');
    for (let i = 0; i < await b.count(); i++) {
      if (!await b.nth(i).isVisible()) continue;
      if (await b.nth(i).evaluate((el: Element) => !!el.closest('nav,header,.nav,#nav,[class*="nav"]'))) continue;
      await b.nth(i).click();
      break;
    }
    const ok = await page.waitForFunction(
      () => {
        const el = document.querySelector('#result-section,#resultSection,#result,.result-container,[id*="result"]');
        if (el && window.getComputedStyle(el).display !== 'none') return true;
        return false;
      },
      { timeout: 30000, polling: 500 }
    ).then(() => true).catch(() => false);

    if (!ok) {
      const after = await page.locator('body *').count();
      expect(after).toBeGreaterThan(before + 5);
    }
  });
});
