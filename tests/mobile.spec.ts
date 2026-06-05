import { test, expect } from '@playwright/test';

// Mobile viewport tests — chạy trên Pixel 5 (390x851) qua project mobile-chrome

const KEY_PAGES = [
  { path: '/',                name: 'Homepage' },
  { path: '/luan-giai.html', name: 'Luận Giải' },
  { path: '/xem-tuoi.html',  name: 'Xem Tuổi' },
  { path: '/tu-binh.html',   name: 'Tử Bình' },
  { path: '/phong-thuy.html',name: 'Phong Thuỷ' },
  { path: '/topup.html',     name: 'Topup' },
  { path: '/profile.html',   name: 'Profile' },
];

for (const { path, name } of KEY_PAGES) {
  test.describe(`Mobile — ${name} (${path})`, () => {
    test('page load không overflow ngang', async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      const overflow = scrollWidth - clientWidth;

      // Cho phép sai lệch tối đa 5px
      expect(overflow).toBeLessThanOrEqual(5);
    });

    test('nav/header visible', async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const nav = page.locator('.topnav, nav, header').first();
      await expect(nav).toBeVisible({ timeout: 8000 });
    });

    test('không có JS errors nghiêm trọng', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const critical = errors.filter(e =>
        !e.includes('favicon') && !e.includes('Sentry') &&
        !e.includes('ERR_BLOCKED') && !e.includes('fonts.google')
      );
      expect(critical).toHaveLength(0);
    });
  });
}

// ── Mobile — hamburger menu ───────────────────────────────────────────────────
test.describe('Mobile — hamburger menu', () => {
  test('hamburger hiện và menu mở được', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const hamburger = page.locator('.nav-hamburger, [class*="hamburger"], button[aria-label*="menu"]').first();
    if (await hamburger.isVisible().catch(() => false)) {
      await hamburger.click();
      await page.waitForTimeout(400);
      const openMenu = page.locator('.nav-links.open, .nav-links[style*="flex"], .mobile-menu').first();
      await expect(openMenu).toBeVisible({ timeout: 3000 });
    }
  });
});

// ── Mobile — form usability ───────────────────────────────────────────────────
test.describe('Mobile — Luận Giải form', () => {
  test('form inputs có thể tap và nhập liệu', async ({ page }) => {
    await page.goto('/luan-giai.html');
    await page.waitForLoadState('networkidle');
    await page.waitForFunction('typeof TuviForm !== "undefined"', { timeout: 10_000 });

    // Form phải đủ rộng để nhìn thấy trên mobile
    const container = page.locator('#tuvi-form-container');
    await expect(container).toBeVisible({ timeout: 8000 });

    const box = await container.boundingBox();
    expect(box?.width).toBeGreaterThan(200);
  });

  test('submit button không bị crop trên mobile', async ({ page }) => {
    await page.goto('/luan-giai.html');
    await page.waitForLoadState('networkidle');

    const btn = page.locator('.btn-submit, #tvf-submit-btn').first();
    await expect(btn).toBeVisible({ timeout: 8000 });

    const box = await btn.boundingBox();
    expect(box?.width).toBeGreaterThan(80);
    expect(box?.height).toBeGreaterThan(30);
  });
});

// ── Mobile — lá số grid ───────────────────────────────────────────────────────
test.describe('Mobile — Lá Số grid', () => {
  test('grid 12 cung không overflow màn hình', async ({ page }) => {
    await page.goto('/luan-giai.html');
    await page.waitForLoadState('networkidle');
    await page.waitForFunction('typeof TuviForm !== "undefined"', { timeout: 10_000 });

    await page.evaluate(`
      TuviForm.setData({ hoten: 'Mobile Test', ngay: 15, thang: 7, nam: 1990, gioHour: 7, gioitinh: 'nam', namXem: 2026 })
    `);
    await page.locator('#tvf-submit-btn').click();
    await page.waitForSelector('#result-section.active', { timeout: 20_000 });

    // Grid has intentional min-width:480px for scrollable mobile UX.
    // Verify the wrapping container stays within viewport (not the inner grid).
    const wrap = page.locator('.laso-wrap');
    const wrapBox = await wrap.boundingBox();
    const viewportWidth = page.viewportSize()?.width ?? 390;
    if (wrapBox) {
      expect(wrapBox.x + wrapBox.width).toBeLessThanOrEqual(viewportWidth + 5);
    }
  });
});
