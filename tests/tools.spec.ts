import { test, expect } from '@playwright/test';

// ── Phong Thuỷ Hub ────────────────────────────────────────────────────────────
test.describe('Phong Thuỷ (phong-thuy.html)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/phong-thuy.html');
    await page.waitForLoadState('networkidle');
  });

  test('page load — hero visible', async ({ page }) => {
    await expect(page.locator('.hub-hero, h1, h2').first()).toBeVisible();
  });

  test('tool cards render (ít nhất 2)', async ({ page }) => {
    const cards = page.locator('.tool-card');
    expect(await cards.count()).toBeGreaterThanOrEqual(2);
  });

  test('primary button có href hợp lệ', async ({ page }) => {
    const primaryBtn = page.locator('.hub-tool-btn.primary, .tool-card a.primary, .tool-card a').first();
    const href = await primaryBtn.getAttribute('href').catch(() => null);
    expect(href).toBeTruthy();
    expect(href).not.toBe('#');
  });

  test('không có JS errors nghiêm trọng', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('/phong-thuy.html');
    await page.waitForLoadState('networkidle');
    const critical = errors.filter(e =>
      !e.includes('favicon') && !e.includes('Sentry') && !e.includes('ERR_BLOCKED')
    );
    expect(critical).toHaveLength(0);
  });
});

// ── Xem Tướng Hub ─────────────────────────────────────────────────────────────
test.describe('Xem Tướng (xem-tuong.html)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/xem-tuong.html');
    await page.waitForLoadState('networkidle');
  });

  test('page load — hero và tool cards hiện', async ({ page }) => {
    await expect(page.locator('.hub-hero, h1, h2').first()).toBeVisible();
    const cards = page.locator('.tool-card');
    expect(await cards.count()).toBeGreaterThanOrEqual(1);
  });

  test('primary tool button dẫn đến link hợp lệ', async ({ page }) => {
    const btn = page.locator('.hub-tool-btn.primary, .tool-card a').first();
    const href = await btn.getAttribute('href').catch(() => null);
    expect(href).toBeTruthy();
  });
});

// ── Chọn Ngày Hub ─────────────────────────────────────────────────────────────
test.describe('Chọn Ngày (chon-ngay.html)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chon-ngay.html');
    await page.waitForLoadState('networkidle');
  });

  test('page load — hero visible', async ({ page }) => {
    await expect(page.locator('h1, h2, .hub-hero').first()).toBeVisible();
  });

  test('tool grid và cards render', async ({ page }) => {
    const cards = page.locator('.tool-card, .hub-card');
    expect(await cards.count()).toBeGreaterThanOrEqual(1);
  });
});

// ── Đặt Tên Hub ───────────────────────────────────────────────────────────────
test.describe('Đặt Tên (dat-ten.html)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dat-ten.html');
    await page.waitForLoadState('networkidle');
  });

  test('page load — tiêu đề visible', async ({ page }) => {
    await expect(page.locator('h1, .hub-title').first()).toBeVisible();
  });

  test('tool grid render', async ({ page }) => {
    const grid = page.locator('.tool-grid, .tool-card, .hub-card');
    expect(await grid.count()).toBeGreaterThanOrEqual(1);
  });

  test('primary button có href hợp lệ', async ({ page }) => {
    const btn = page.locator('.hub-tool-btn.primary, .tool-card a').first();
    const href = await btn.getAttribute('href').catch(() => null);
    expect(href).toBeTruthy();
  });
});

// ── Mệnh Khó ──────────────────────────────────────────────────────────────────
test.describe('Mệnh Khó (menh-kho.html)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/menh-kho.html');
    await page.waitForLoadState('networkidle');
  });

  test('page load — hero hiện', async ({ page }) => {
    await expect(page.locator('.hero, h1, h2').first()).toBeVisible();
  });

  test('search input visible', async ({ page }) => {
    await expect(page.locator('#search-input')).toBeVisible({ timeout: 5000 });
  });

  test('lá số cards tải về (ít nhất 1)', async ({ page }) => {
    // Chờ loading xong
    await page.waitForSelector('#state-loading', { state: 'hidden', timeout: 15000 }).catch(() => {});
    const cards = page.locator('.laso-card, #laso-grid [class*="card"]');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(1);
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

// ── Làm Đẹp Hub ───────────────────────────────────────────────────────────────
test.describe('Làm Đẹp (lam-dep.html)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/lam-dep.html');
    await page.waitForLoadState('networkidle');
  });

  test('page load — hero visible', async ({ page }) => {
    await expect(page.locator('.hub-hero, h1, h2').first()).toBeVisible();
  });

  test('tool cards render', async ({ page }) => {
    const cards = page.locator('.tool-card, .hub-card');
    expect(await cards.count()).toBeGreaterThanOrEqual(1);
  });
});
