import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('hero render', async ({ page }) => {
    await expect(page.locator('h1, .hero-title, .hero h2').first()).toBeVisible();
  });

  test('band "Khám phá bản thân" render', async ({ page }) => {
    // Catalog tab đã dời sang /cong-cu; trang chủ giờ dẫn vào Luận Đường qua band.
    // .space-card (lưới tĩnh 4 ô) đã thay bằng .tool-card (marquee 8 tool) trong
    // đợt redesign homepage — xem public/index.html.
    await expect(page.locator('.tool-card').first()).toBeVisible();
  });

  test('tool links render (it nhat 5)', async ({ page }) => {
    // Tim a[href] visible, khong phai nav items
    const allLinks = page.locator('a[href]:not(.nav-dd-item):not(.nav-brand):not(.nav-link):not([class*="nav-"])');
    const visible: number[] = [];
    const count = await allLinks.count();
    for (let i = 0; i < Math.min(count, 50); i++) {
      if (await allLinks.nth(i).isVisible()) visible.push(i);
      if (visible.length >= 5) break;
    }
    expect(visible.length).toBeGreaterThanOrEqual(5);
  });

  test('khong co JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const critical = errors.filter(e =>
      !e.includes('favicon') && !e.includes('fonts.google') &&
      !e.includes('Sentry') && !e.includes('ERR_BLOCKED')
    );
    expect(critical).toHaveLength(0);
  });
});

test.describe('Trang Công cụ (/cong-cu)', () => {
  test('catalog render', async ({ page }) => {
    await page.goto('/cong-cu');
    await page.waitForLoadState('networkidle');
    // Thứ phải luôn có, bất kể lối xem nào đang bật: lưới công cụ.
    await expect(page.locator('.tool-card').first()).toBeVisible();
  });

  test('thanh tab bộ môn bấm tới được', async ({ page }) => {
    await page.goto('/cong-cu');
    await page.waitForLoadState('networkidle');
    // ⚠️ Bộ E2E này chạy thẳng vào PROD (xem playwright.yml), nên spec phải đúng
    // với CẢ bản đang chạy lẫn bản trong PR — nếu không thì hoặc CI đỏ oan trước
    // khi merge, hoặc xanh giả rồi vỡ ngay sau khi deploy.
    // Bản mới mặc định mở lối "theo nhu cầu" và giấu thanh tab sau nút chuyển;
    // bản cũ không có nút đó và tab hiện sẵn.
    const seg = page.locator('#viewSeg button[data-view="bo-mon"]');
    if (await seg.count()) await seg.click();
    await expect(page.locator('.tab-btn').first()).toBeVisible();
  });
});
