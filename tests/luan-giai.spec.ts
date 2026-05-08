import { test, expect } from '@playwright/test';

test.describe('Luan Giai La So', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/luan-giai.html');
    await page.waitForLoadState('networkidle');
  });

  test('form render', async ({ page }) => {
    await expect(page.locator('h1, h2, h3, .form-container, form, #tuviForm').first()).toBeVisible();
    await expect(page.locator('select').first()).toBeAttached();
  });

  test('submit -> DOM thay doi', async ({ page }) => {
    await fillVisibleSelects(page);
    const submit = await findBtn(page);
    if (!submit) throw new Error('No submit button');
    const before = await page.locator('body *').count();
    await submit.click();
    await page.waitForFunction((n: number) => document.querySelectorAll('body *').length > n + 10, before, { timeout: 25000 });
  });

  test('paywall KHONG auto-popup', async ({ page }) => {
    let pop = false;
    page.on('dialog', () => { pop = true; });
    await page.waitForTimeout(2000);
    expect(pop).toBe(false);
  });
});

async function fillVisibleSelects(page: any) {
  const s = page.locator('select');
  for (let i = 0; i < await s.count(); i++) {
    if (!await s.nth(i).isVisible()) continue;
    const o = await s.nth(i).locator('option').allInnerTexts();
    if (o.length > 1) await s.nth(i).selectOption({ index: 1 });
  }
}
async function findBtn(page: any) {
  const b = page.locator('button');
  for (let i = 0; i < await b.count(); i++) {
    if (!await b.nth(i).isVisible()) continue;
    if (await b.nth(i).evaluate((el: Element) => !!el.closest('nav,header,.nav,#nav,[class*="nav"]'))) continue;
    return b.nth(i);
  }
  return null;
}
