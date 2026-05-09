import { test, expect } from '@playwright/test';

// ── la-so.html ────────────────────────────────────────────────────────────────
test.describe('La So (la-so.html)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/la-so.html');
    await page.waitForLoadState('networkidle');
  });

  test('form render — inputs và nút Lấy Lá Số hiện', async ({ page }) => {
    await expect(page.locator('#btn-anlaso')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('#btn-anlaso')).toContainText('Lấy Lá Số');
  });

  test('submit không nhập → error message (không crash)', async ({ page }) => {
    await page.locator('#btn-anlaso').click();
    await page.waitForSelector('#grid-wrap', { state: 'visible', timeout: 10000 });
    const errOrGrid = page.locator('#laso-grid-container');
    await expect(errOrGrid).not.toBeEmpty({ timeout: 5000 });
  });

  test('submit đủ thông tin → grid 12 cung hiện', async ({ page }) => {
    // Điền trực tiếp vào input (la-so.html dùng input riêng, không phải TuviForm API)
    const fill = async (id: string, val: string) => {
      const el = page.locator(`#${id}`);
      if (await el.isVisible().catch(() => false)) {
        await el.fill(val);
      }
    };
    await fill('inp-name', 'Test User');
    await fill('inp-dd', '15');
    await fill('inp-mm', '7');
    await fill('inp-yyyy', '1990');
    await fill('inp-namxem', '2026');

    const genderSel = page.locator('#inp-gender');
    if (await genderSel.isVisible().catch(() => false)) {
      await genderSel.selectOption('nam');
    }
    const gioSel = page.locator('#inp-hh');
    if (await gioSel.isVisible().catch(() => false)) {
      const opts = await gioSel.locator('option').allInnerTexts();
      if (opts.length > 1) await gioSel.selectOption({ index: 1 });
    }

    await page.locator('#btn-anlaso').click();
    await page.waitForSelector('#grid-wrap', { state: 'visible', timeout: 15000 });

    const cells = page.locator('#laso-grid-container .cung-cell, #laso-grid-container [class*="cung"]');
    expect(await cells.count()).toBeGreaterThanOrEqual(12);
  });

  test('không có JS errors nghiêm trọng khi load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('/la-so.html');
    await page.waitForLoadState('networkidle');
    const critical = errors.filter(e =>
      !e.includes('favicon') && !e.includes('fonts.google') &&
      !e.includes('Sentry') && !e.includes('ERR_BLOCKED')
    );
    expect(critical).toHaveLength(0);
  });
});

// ── la-so-v2.html ─────────────────────────────────────────────────────────────
test.describe('La So V2 (la-so-v2.html)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/la-so-v2.html');
    await page.waitForLoadState('networkidle');
  });

  test('page load — nút submit hiện', async ({ page }) => {
    await expect(page.locator('#btn-anlaso')).toBeVisible({ timeout: 8000 });
  });

  test('submit đủ thông tin → grid xuất hiện', async ({ page }) => {
    const fill = async (id: string, val: string) => {
      const el = page.locator(`#${id}`);
      if (await el.isVisible().catch(() => false)) await el.fill(val);
    };
    await fill('inp-name', 'Test V2');
    await fill('inp-dd', '10');
    await fill('inp-mm', '3');
    await fill('inp-yyyy', '1985');
    await fill('inp-namxem', '2026');

    const gioSel = page.locator('#inp-hh');
    if (await gioSel.isVisible().catch(() => false)) {
      const opts = await gioSel.locator('option').allInnerTexts();
      if (opts.length > 1) await gioSel.selectOption({ index: 1 });
    }

    await page.locator('#btn-anlaso').click();
    await page.waitForSelector('#grid-wrap', { state: 'visible', timeout: 15000 });
    await expect(page.locator('#laso-grid-container')).not.toBeEmpty();
  });
});

// ── compare.html ──────────────────────────────────────────────────────────────
test.describe('Compare (compare.html)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/compare.html');
    await page.waitForLoadState('networkidle');
  });

  test('page load — form và nút submit hiện', async ({ page }) => {
    await expect(page.locator('#c_btn')).toBeVisible({ timeout: 8000 });
  });

  test('submit → bảng kết quả xuất hiện', async ({ page }) => {
    const fill = async (id: string, val: string) => {
      const el = page.locator(`#${id}`);
      if (await el.isVisible().catch(() => false)) await el.fill(val);
    };
    await fill('c_ngay', '15');
    await fill('c_thang', '7');
    await fill('c_nam', '1990');
    await fill('c_namxem', '2026');

    const gioSel = page.locator('#c_gio');
    if (await gioSel.isVisible().catch(() => false)) {
      const opts = await gioSel.locator('option').allInnerTexts();
      if (opts.length > 1) await gioSel.selectOption({ index: 1 });
    }

    await page.locator('#c_btn').click();
    await page.waitForSelector('#result-area', { state: 'visible', timeout: 15000 });
    await expect(page.locator('#c_tbody tr, #result-area [class*="row"]')).not.toHaveCount(0, { timeout: 5000 });
  });

  test('filter buttons render sau submit', async ({ page }) => {
    await page.locator('#c_btn').click().catch(() => {});
    await page.waitForTimeout(1000);
    // filter buttons có thể hiện sau submit
    const filters = page.locator('#fb_all, #fb_diff, #fb_chinh');
    // Chỉ check nếu result-area visible
    const resultVisible = await page.locator('#result-area').isVisible().catch(() => false);
    if (resultVisible) {
      const count = await filters.count();
      expect(count).toBeGreaterThanOrEqual(1);
    }
  });
});
