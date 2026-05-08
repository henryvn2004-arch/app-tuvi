import { test, expect } from '@playwright/test';

test.describe('Tử Bình — Regression paywall', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tu-binh.html');
    await page.waitForLoadState('networkidle');
  });

  test('page load OK', async ({ page }) => {
    await expect(page.locator('h1, .page-title')).toBeVisible();
  });

  test('🔴 REGRESSION: paywall KHÔNG auto-popup khi submit', async ({ page }) => {
    const dialogs: string[] = [];
    page.on('dialog', d => { dialogs.push(d.message()); d.dismiss(); });

    // Fill form tối thiểu
    const selects = page.locator('select');
    const count = await selects.count();
    for (let i = 0; i < count; i++) {
      const opts = await selects.nth(i).locator('option').allInnerTexts();
      if (opts.length > 1) await selects.nth(i).selectOption({ index: 1 });
    }
    const namInput = page.locator('input[type="number"], input[name*="nam"]').first();
    if (await namInput.isVisible()) await namInput.fill('1990');

    const submit = page.locator('button[type="submit"], button:has-text("Xem"), button:has-text("Tính")').first();
    await submit.click();
    await page.waitForTimeout(3000);

    let autoModal = false;
    try {
      autoModal = await page.locator('.tuvi-paywall-modal, [class*="paywall-modal"]').isVisible({ timeout: 500 });
    } catch { autoModal = false; }

    expect(dialogs).toHaveLength(0);
    expect(autoModal).toBe(false);
    console.log('✅ No auto-popup regression');
  });

  test('paywall button visible INLINE sau submit', async ({ page }) => {
    const selects = page.locator('select');
    const count = await selects.count();
    for (let i = 0; i < count; i++) {
      const opts = await selects.nth(i).locator('option').allInnerTexts();
      if (opts.length > 1) await selects.nth(i).selectOption({ index: 1 });
    }
    const namInput = page.locator('input[type="number"], input[name*="nam"]').first();
    if (await namInput.isVisible()) await namInput.fill('1990');

    await page.locator('button[type="submit"], button:has-text("Xem"), button:has-text("Tính")').first().click();

    const btn = page.locator('button:has-text("Mở Khóa"), .paywall-btn, [class*="unlock"]').first();
    await expect(btn).toBeVisible({ timeout: 20_000 });

    const inModal = await btn.evaluate(el => !!el.closest('.modal, [class*="modal"], [role="dialog"]'));
    expect(inModal).toBe(false);
  });
});
