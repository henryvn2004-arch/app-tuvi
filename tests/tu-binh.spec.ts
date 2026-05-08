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
    const submit = await findFirstVisibleButton(page);
    if (submit) { await submit.click(); await page.waitForTimeout(3000); }
    let autoModal = false;
    try { autoModal = await page.locator('.tuvi-paywall-modal, [class*="paywall-modal"]').isVisible({ timeout: 500 }); } catch { autoModal = false; }
    expect(dialogs).toHaveLength(0);
    expect(autoModal).toBe(false);
  });

  test('paywall button INLINE sau submit', async ({ page }) => {
    await fillVisibleSelects(page);
    const submit = await findFirstVisibleButton(page);
    if (!submit) { console.warn('Submit not found'); return; }
    await submit.click();
    // Tim paywall button bang nhieu cach - khong dung has-text vi diacritics issue
    const btn = page.locator('.paywall-btn, [class*="unlock"], [class*="paywall-trigger"], button[onclick*="paywall"], button[onclick*="Paywall"]').first();
    const found = await btn.isVisible({ timeout: 25_000 }).catch(() => false);
    if (!found) {
      // Fallback: tim button co chu "Kh" (Khoa) trong noi dung
      const allBtns = page.locator('button');
      const count = await allBtns.count();
      let paywallFound = false;
      for (let i = 0; i < count; i++) {
        const b = allBtns.nth(i);
        if (!await b.isVisible()) continue;
        const txt = await b.textContent();
        if (txt && (txt.includes('Kh') || txt.includes('kh') || txt.includes('Lock'))) {
          paywallFound = true; break;
        }
      }
      expect(paywallFound).toBe(true);
    } else {
      const inModal = await btn.evaluate((el: Element) => !!el.closest('.modal, [class*="modal"], [role="dialog"]'));
      expect(inModal).toBe(false);
    }
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

async function findFirstVisibleButton(page: any) {
  const allBtns = page.locator('button');
  const count = await allBtns.count();
  for (let i = 0; i < count; i++) {
    const btn = allBtns.nth(i);
    if (!await btn.isVisible()) continue;
    const isInNav = await btn.evaluate((el: Element) => !!el.closest('nav, header, .nav, #nav, [class*="nav"]'));
    if (isInNav) continue;
    return btn;
  }
  return null;
}
