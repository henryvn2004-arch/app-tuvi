import { test, expect } from '@playwright/test';

test.describe('Xem Tuoi Vo Chong', () => {
  test('page load + TuviForm render 2 panels', async ({ page }) => {
    await page.goto('/xem-tuoi.html');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1.hero-tuoi, .hero-tuoi h1').first()).toBeVisible();
    // TuviForm render vao #tuvi-form-a va #tuvi-form-b
    await expect(page.locator('#tuvi-form-a')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('#tuvi-form-b')).toBeVisible({ timeout: 5_000 });
  });

  test('submit #btn-analyze -> #result-section visible', async ({ page }) => {
    await page.goto('/xem-tuoi.html');
    await page.waitForLoadState('networkidle');

    // Fill visible selects trong ca 2 form panels
    const selects = page.locator('select');
    const count = await selects.count();
    for (let i = 0; i < count; i++) {
      const sel = selects.nth(i);
      if (!await sel.isVisible()) continue;
      const opts = await sel.locator('option').allInnerTexts();
      if (opts.length > 1) await sel.selectOption({ index: 1 });
    }

    // Nam xem
    const namXem = page.locator('#nam-xem');
    if (await namXem.isVisible()) await namXem.fill('2026');

    // Click submit chinh xac: #btn-analyze
    const btn = page.locator('#btn-analyze');
    await expect(btn).toBeVisible({ timeout: 5_000 });
    await btn.click();

    // #result-section bat dau display:none -> analyze() set display:block
    await page.waitForFunction(
      () => {
        const el = document.getElementById('result-section');
        return el && el.style.display !== 'none' && el.style.display !== '';
      },
      { timeout: 25_000, polling: 300 }
    );
    console.log('result-section visible sau submit');
  });
});
