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
    await fillRequired(page);
    const s = await findBtn(page);
    if (s) { await s.click(); await page.waitForTimeout(3000); }
    let modal = false;
    try { modal = await page.locator('.tuvi-paywall-modal,[class*="paywall-modal"]').isVisible({ timeout: 500 }); } catch { modal = false; }
    expect(dialogs).toHaveLength(0);
    expect(modal).toBe(false);
  });

  test('sau submit DOM thay doi khong co modal', async ({ page }) => {
    await fillRequired(page);
    const s = await findBtn(page);
    if (!s) { console.warn('No submit btn'); return; }
    const before = await page.locator('body *').count();
    await s.click();
    await page.waitForFunction((n: number) => document.querySelectorAll('body *').length > n + 5, before, { timeout: 20000 });
    const modal = await page.locator('.tuvi-paywall-modal,[class*="paywall-modal"]').isVisible({ timeout: 500 }).catch(() => false);
    expect(modal).toBe(false);
  });
});

// Điền ĐỦ các trường bắt buộc của form Tử Bình như người dùng thật:
// hoten (text) KHÔNG phải <select> nên fillVisibleSelects bỏ sót → analyze()
// bị chặn ở validation, DOM không render. Phải điền tay. `nam` (năm sinh) giờ
// là <select> (đồng bộ với Ngày/Tháng) nên fillVisibleSelects đã tự khớp.
async function fillRequired(page: any) {
  const hoten = page.locator('#hoten');
  if (await hoten.count() && await hoten.first().isVisible()) await hoten.first().fill('Nguyễn Văn Test');
  await fillVisibleSelects(page);
}

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
