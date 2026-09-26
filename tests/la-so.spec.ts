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
    // inp-dd/mm là <select>, inp-yyyy/inp-name/inp-namxem là <input>
    const fillInput = async (id: string, val: string) => {
      const el = page.locator(`#${id}`);
      if (await el.isVisible().catch(() => false)) await el.fill(val);
    };
    const fillSelect = async (id: string, val: string) => {
      const el = page.locator(`#${id}`);
      if (await el.isVisible().catch(() => false)) await el.selectOption(val);
    };
    await fillInput('inp-name', 'Test User');
    await fillSelect('inp-dd', '15');
    await fillSelect('inp-mm', '7');
    await fillInput('inp-yyyy', '1990');
    await fillInput('inp-namxem', '2026');

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
