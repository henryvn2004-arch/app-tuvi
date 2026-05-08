import { test, expect } from '@playwright/test';

test.describe('Tử Bình — Regression paywall', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tu-binh.html');
    await page.waitForLoadState('networkidle');
  });

  test('page load OK', async ({ page }) => {
    await expect(page.locator('h1, .page-title, .tool-title, header h2').first()).toBeVisible();
  });

  test('🔴 REGRESSION: paywall KHÔNG auto-popup khi submit', async ({ page }) => {
    const dialogs: string[] = [];
    page.on('dialog', d => { dialogs.push(d.message()); d.dismiss(); });

    await fillVisibleSelects(page);
    const namInput = page.locator('input[type="number"], input[name*="nam"]').first();
    if (await namInput.isVisible()) await namInput.fill('1990');

    const submit = page.locator('button[type="submit"], button:has-text("Xem"), button:has-text("Tính"), button:has-text("Tra")').first();
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
    await fillVisibleSelects(page);
    const namInput = page.locator('input[type="number"], input[name*="nam"]').first();
    if (await namInput.isVisible()) await namInput.fill('1990');

    await page.locator('button[type="submit"], button:has-text("Xem"), button:has-text("Tính")').first().click();

    const btn = page.locator('button:has-text("Mở Khóa"), .paywall-btn, [class*="unlock"]').first();
    await expect(btn).toBeVisible({ timeout: 20_000 });

    const inModal = await btn.evaluate(el => !!el.closest('.modal, [class*="modal"], [role="dialog"]'));
    expect(inModal).toBe(false);
  });
});

// Chỉ fill các select VISIBLE — bỏ qua hidden (như #tvf-utc)
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
