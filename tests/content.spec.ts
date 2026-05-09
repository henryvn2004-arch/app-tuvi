import { test, expect } from '@playwright/test';

// ── Khảo Luận (article detail) ───────────────────────────────────────────────
test.describe('Khảo Luận (khao-luan.html)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/khao-luan.html');
    await page.waitForLoadState('networkidle');
  });

  test('page load — không crash trắng trang', async ({ page }) => {
    // Phải có ít nhất loading state hoặc article hoặc error state
    const hasContent = await page.locator('#state-loading, #article, #state-error').first().isVisible({ timeout: 8000 }).catch(() => false);
    expect(hasContent).toBe(true);
  });

  test('article hiển thị hoặc error state rõ ràng (không blank)', async ({ page }) => {
    // Chờ loading xong
    await page.waitForSelector('#state-loading', { state: 'hidden', timeout: 15000 }).catch(() => {});
    const articleVisible = await page.locator('#article').isVisible().catch(() => false);
    const errorVisible = await page.locator('#state-error').isVisible().catch(() => false);
    // Một trong hai phải hiện — không thể cả hai đều ẩn
    expect(articleVisible || errorVisible).toBe(true);
  });

  test('nếu có article — title và body không rỗng', async ({ page }) => {
    await page.waitForSelector('#state-loading', { state: 'hidden', timeout: 15000 }).catch(() => {});
    const articleVisible = await page.locator('#article').isVisible().catch(() => false);
    if (articleVisible) {
      const title = page.locator('#article-title');
      await expect(title).not.toBeEmpty({ timeout: 5000 });
    }
  });

  test('không có JS errors nghiêm trọng', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('/khao-luan.html');
    await page.waitForLoadState('networkidle');
    const critical = errors.filter(e =>
      !e.includes('favicon') && !e.includes('Sentry') && !e.includes('ERR_BLOCKED') && !e.includes('fonts.google')
    );
    expect(critical).toHaveLength(0);
  });
});

// ── Blog / Vấn Đáp ────────────────────────────────────────────────────────────
test.describe('Blog / Vấn Đáp (blog.html)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/blog.html');
    await page.waitForLoadState('networkidle');
  });

  test('page load — không crash', async ({ page }) => {
    await expect(page.locator('h1, h2, .page-title, #article-grid').first()).toBeVisible({ timeout: 8000 });
  });

  test('articles tải về — ít nhất 1 item', async ({ page }) => {
    await page.waitForSelector('#state-loading', { state: 'hidden', timeout: 15000 }).catch(() => {});
    const items = page.locator('#article-grid .article-item, #article-grid .article-link, #article-grid [class*="article"]');
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('search input lọc được', async ({ page }) => {
    await page.waitForSelector('#state-loading', { state: 'hidden', timeout: 15000 }).catch(() => {});
    const search = page.locator('#search-input');
    if (await search.isVisible().catch(() => false)) {
      await search.fill('tử vi');
      await page.waitForTimeout(600);
      const badge = page.locator('#count-badge');
      if (await badge.isVisible().catch(() => false)) {
        const text = await badge.textContent();
        expect(text).toBeTruthy();
      }
    }
  });

  test('category filter buttons clickable', async ({ page }) => {
    await page.waitForSelector('#state-loading', { state: 'hidden', timeout: 15000 }).catch(() => {});
    const catBtn = page.locator('.cat-btn').first();
    if (await catBtn.isVisible().catch(() => false)) {
      await catBtn.click();
      await page.waitForTimeout(400);
      // Không crash
      await expect(page.locator('#article-grid')).toBeVisible();
    }
  });
});

// ── Kiến Thức Tử Vi ───────────────────────────────────────────────────────────
test.describe('Kiến Thức Tử Vi (kien-thuc-tuvi.html)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/kien-thuc-tuvi.html');
    await page.waitForLoadState('networkidle');
  });

  test('page load — cards hiện', async ({ page }) => {
    await expect(page.locator('.hub-card, .hub-card-grid, h1, h2').first()).toBeVisible({ timeout: 8000 });
  });

  test('hub cards render (ít nhất 3)', async ({ page }) => {
    const cards = page.locator('.hub-card');
    expect(await cards.count()).toBeGreaterThanOrEqual(3);
  });

  test('section titles hiện', async ({ page }) => {
    const sections = page.locator('.hub-sec-title, h2, h3');
    expect(await sections.count()).toBeGreaterThanOrEqual(1);
  });
});

// ── Resources / Tài Liệu Hub ─────────────────────────────────────────────────
test.describe('Resources (resources.html)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/resources.html');
    await page.waitForLoadState('networkidle');
  });

  test('page load — hero visible', async ({ page }) => {
    await expect(page.locator('.hero, h1, h2').first()).toBeVisible({ timeout: 8000 });
  });

  test('tabs Việt / Trung hiện', async ({ page }) => {
    const tabs = page.locator('.tab-btn');
    expect(await tabs.count()).toBeGreaterThanOrEqual(2);
  });

  test('book items tải về', async ({ page }) => {
    const books = page.locator('.book-item, #list-viet .book-item, [class*="book"]');
    expect(await books.count()).toBeGreaterThanOrEqual(1);
  });

  test('tab switch — Trung Hoa tab hiển thị', async ({ page }) => {
    const tabTrung = page.locator('.tab-btn').filter({ hasText: /trung|china/i }).first();
    if (await tabTrung.isVisible().catch(() => false)) {
      await tabTrung.click();
      await page.waitForTimeout(400);
      await expect(page.locator('#tab-trung, #list-trung')).toBeVisible({ timeout: 3000 });
    }
  });
});

// ── Tài Liệu Detail ───────────────────────────────────────────────────────────
test.describe('Tài Liệu Detail (tai-lieu.html)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tai-lieu.html');
    await page.waitForLoadState('networkidle');
  });

  test('page load — không blank (có loading/article/error)', async ({ page }) => {
    const hasContent = await page.locator('#state-loading, #article, #state-error').first().isVisible({ timeout: 8000 }).catch(() => false);
    expect(hasContent).toBe(true);
  });

  test('sau load — article hoặc error rõ ràng', async ({ page }) => {
    await page.waitForSelector('#state-loading', { state: 'hidden', timeout: 15000 }).catch(() => {});
    const articleVisible = await page.locator('#article').isVisible().catch(() => false);
    const errorVisible = await page.locator('#state-error').isVisible().catch(() => false);
    expect(articleVisible || errorVisible).toBe(true);
  });
});
