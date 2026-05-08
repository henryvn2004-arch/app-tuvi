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
    // Tim submit button ngoai nav
    const allBtns = page.locator('button');
    const btnCount = await allBtns.count();
    for (let i = 0; i < btnCount; i++) {
      const btn = allBtns.nth(i);
      if (!await btn.isVisible()) continue;
      const isInNav = await btn.evaluate((el: Element) => !!el.closest('nav, header, .nav, #nav, [class*="nav"]'));
      if (isInNav) continue;
      await btn.click();
      break;
    }
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
