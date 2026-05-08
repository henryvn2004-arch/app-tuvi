import { test, expect } from '@playwright/test';

test.describe('Tu Binh Regression paywall', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tu-binh.html');
    await page.waitForLoadState('networkidle');
  });

  test('page load OK', async ({ page }) => {
    await expect(page.locator('h1, h2, h3, .form-container, form').first()).toBeVisible();
  });

  test('REGRESSION paywall KHONG auto-popup khi submit', async ({ page }) => {
    const dialogs: string[] = [];
    page.on('dialog', d => { dialogs.push(d.message()); d.dismiss(); });

    await fillVisibleSelects(page);
    const submit = await findSubmit(page);
    if (submit) {
      await submit.click();
      await page.waitForTimeout(3000);
    }

    let autoModal = false;
    try {
      autoModal = await page.locator('.tuvi-paywall-modal, [class*="paywall-modal"]').isVisible({ timeout: 500 });
    } catch { autoModal = false; }

    expect(dialogs).toHaveLength(0);
    expect(autoModal).toBe(false);
  });

  test('paywall button INLINE sau submit', async ({ page }) => {
    await fillVisibleSelects(page);
    const submit = await findSubmit(page);
    if (!submit) { console.warn('Submit button not found'); return; }
    await submit.click();
    const btn = page.locator('button:has-text("Mo Khoa"), .paywall-btn, [class*="unlock"]').first();
    await expect(btn).toBeVisible({ timeout: 25_000 });
    const inModal = await btn.evaluate((el: Element) => !!el.closest('.modal, [class*="modal"], [role="dialog"]'));
    expect(inModal).toBe(false);
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

async function findSubmit(page: any) {
  const candidates = [
    '#tvf-submit', '.btn-analyze', '.btn-submit',
    'button[onclick*="tinh"]', 'button[onclick*="analyz"]',
    'button:has-text("Tinh Tu Tru")', 'button:has-text("Xem Bat Tu")',
    'button:has-text("Phan Tich")', 'button:has-text("Tinh")',
    'button:has-text("Xem")', 'button[type="submit"]',
  ];
  for (const sel of candidates) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 300 })) return el;
    } catch { continue; }
  }
  return null;
}
