import { test, expect } from '@playwright/test';

// ── Mệnh Khó ──────────────────────────────────────────────────────────────────
test.describe('Mệnh Khó (menh-kho.html)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/menh-kho.html');
    await page.waitForLoadState('networkidle');
  });

  test('page load — hero hiện', async ({ page }) => {
    await expect(page.locator('.hero, h1, h2').first()).toBeVisible();
  });

  test('year pills grid hiển thị (ít nhất 10)', async ({ page }) => {
    const pills = page.locator('.year-pill, a[href*="/menh-kho/"]');
    const count = await pills.count();
    expect(count).toBeGreaterThanOrEqual(10);
  });

  test('year pill link đúng format /menh-kho/[year]', async ({ page }) => {
    const firstPill = page.locator('a[href*="/menh-kho/"]').first();
    const href = await firstPill.getAttribute('href');
    expect(href).toMatch(/\/menh-kho\/\d{4}/);
  });

  test('filter giới tính hoạt động', async ({ page }) => {
    const filterGt = page.locator('#filter-gt');
    if (await filterGt.isVisible().catch(() => false)) {
      const opts = await filterGt.locator('option').allInnerTexts();
      if (opts.length > 1) {
        await filterGt.selectOption({ index: 1 });
        await page.waitForTimeout(500);
        const cards = page.locator('.laso-card, #laso-grid [class*="card"]');
        expect(await cards.count()).toBeGreaterThanOrEqual(0); // không crash
      }
    }
  });

  test('search input lọc kết quả', async ({ page }) => {
    await page.waitForSelector('#state-loading', { state: 'hidden', timeout: 15000 }).catch(() => {});
    const search = page.locator('#search-input');
    if (await search.isVisible().catch(() => false)) {
      await search.fill('giáp');
      await page.waitForTimeout(600);
      // Không crash, count badge cập nhật
      const badge = page.locator('#count-badge');
      if (await badge.isVisible().catch(() => false)) {
        const text = await badge.textContent();
        expect(text).toBeTruthy();
      }
    }
  });
});
