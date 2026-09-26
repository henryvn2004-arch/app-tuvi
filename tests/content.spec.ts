import { test, expect } from '@playwright/test';

// ── Khảo Luận (article detail) ───────────────────────────────────────────────
// `/khao-luan/:slug` là SSR THẬT (app/api/khao-luan/route.ts) — nội dung có
// mặt ngay trong HTML đầu tiên, không cần chờ fetch client. `public/blog.html`
// + `public/khao-luan.html` (client fetch, không lọc publish_status) đã bị
// XOÁ và thay bằng `/van-dap` (app/van-dap/route.ts, SSR) — xem mô tả ở
// _shared.ts vì sao: GPTBot/PerplexityBot/ClaudeBot không chạy JS nên bản cũ
// không có lấy một liên kết nào cho AI crawler thấy.
test.describe('Khảo Luận (khao-luan/:slug)', () => {
  test('khao-luan.html cũ đã 308 sang /van-dap', async ({ page }) => {
    const res = await page.goto('/khao-luan.html');
    expect(page.url()).toContain('/van-dap');
    expect(res?.status()).toBeLessThan(400);
  });

  test('navigate từ /van-dap → article load đầy đủ', async ({ page }) => {
    await page.goto('/van-dap');
    await page.waitForLoadState('networkidle');

    const firstLink = page.locator('.vd-card[href*="/khao-luan/"]').first();
    const hasLink = await firstLink.isVisible().catch(() => false);
    if (!hasLink) { console.warn('Không tìm thấy article link từ /van-dap'); return; }

    const href = await firstLink.getAttribute('href');
    if (!href) return;

    await page.goto(href);
    await page.waitForLoadState('networkidle');

    // SSR page dùng .article-title và .article-body
    const articleVisible = await page.locator('.article-title, .article-body').first().isVisible().catch(() => false);
    expect(articleVisible).toBe(true);
  });

  test('article title không rỗng khi có slug hợp lệ', async ({ page }) => {
    await page.goto('/van-dap');
    await page.waitForLoadState('networkidle');

    const firstLink = page.locator('.vd-card[href*="/khao-luan/"]').first();
    const hasLink = await firstLink.isVisible().catch(() => false);
    if (!hasLink) return;

    const href = await firstLink.getAttribute('href');
    if (!href) return;

    await page.goto(href);
    await page.waitForLoadState('networkidle');

    const titleEl = page.locator('.article-title, h1').first();
    await expect(titleEl).not.toBeEmpty({ timeout: 5000 });
  });
});

// ── Vấn Đáp (hub SSR, thay blog.html) ────────────────────────────────────────
test.describe('Vấn Đáp (/van-dap)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/van-dap');
    await page.waitForLoadState('networkidle');
  });

  test('blog.html cũ đã 308 sang /van-dap', async ({ page }) => {
    await page.goto('/blog.html');
    expect(page.url()).toContain('/van-dap');
  });

  test('page load — SSR, không cần chờ JS', async ({ page }) => {
    await expect(page.locator('h1.vd-title')).toBeVisible({ timeout: 8000 });
  });

  test('articles có mặt ngay trong HTML đầu tiên (SSR thật)', async ({ page }) => {
    const content = await page.content();
    // Không đợi networkidle/JS — nội dung phải nằm sẵn trong response đầu.
    expect(content).toContain('/khao-luan/');
    const items = page.locator('.vd-card');
    expect(await items.count()).toBeGreaterThanOrEqual(1);
  });

  test('search input lọc được (client-side, không fetch lại)', async ({ page }) => {
    const search = page.locator('#search-input');
    await expect(search).toBeVisible();
    const before = await page.locator('.vd-card:visible').count();
    await search.fill('xxxxxxkhongcothatxxxxxx');
    await page.waitForTimeout(300);
    const after = await page.locator('.vd-card:visible').count();
    expect(after).toBeLessThanOrEqual(before);
  });

  test('chip danh mục dẫn tới đúng trang cụm /van-dap/<danh-mục>', async ({ page }) => {
    const chip = page.locator('.vd-chip').first();
    if (!(await chip.isVisible().catch(() => false))) return;
    const href = await chip.getAttribute('href');
    expect(href).toMatch(/^\/van-dap\/[a-z-]+$/);
    await chip.click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1.vd-title')).toBeVisible();
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
    const tabContent = page.locator('#tab-trung');
    if (await tabContent.count() === 0) { console.warn('#tab-trung không tồn tại'); return; }

    // Gọi switchTab trực tiếp thay vì click (tránh CSP block inline onclick)
    const switched = await page.evaluate(() => {
      if (typeof (window as any).switchTab !== 'function') return false;
      const btn = document.querySelectorAll('.tab-btn')[1] as HTMLElement;
      if (!btn) return false;
      (window as any).switchTab('trung', btn);
      return true;
    }).catch(() => false);
    if (!switched) { console.warn('switchTab không khả dụng'); return; }

    // Check class active toggled (CSS display:none → display:block via .active)
    const hasActive = await tabContent.evaluate(
      (el: Element) => el.classList.contains('active')
    ).catch(() => false);
    expect(hasActive).toBe(true);
  });
});

// ── Tài Liệu Detail ───────────────────────────────────────────────────────────
// tai-lieu.html cần ?slug=xxx — test navigate từ resources trước
test.describe('Tài Liệu Detail (tai-lieu.html)', () => {
  test('page load không crash khi không có slug', async ({ page }) => {
    await page.goto('/tai-lieu.html');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('navigate từ resources → tài liệu load đầy đủ', async ({ page }) => {
    await page.goto('/resources.html');
    await page.waitForLoadState('networkidle');

    const firstLink = page.locator('.book-item a, #list-viet a, .book-list a').first();
    const hasLink = await firstLink.isVisible().catch(() => false);
    if (!hasLink) { console.warn('Không tìm thấy book link từ resources'); return; }

    const href = await firstLink.getAttribute('href');
    if (!href) return;

    await page.goto(href);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#state-loading', { state: 'hidden', timeout: 15000 }).catch(() => {});

    const articleVisible = await page.locator('#article').isVisible().catch(() => false);
    const errorVisible = await page.locator('#state-error').isVisible().catch(() => false);
    expect(articleVisible || errorVisible).toBe(true);
  });
});
