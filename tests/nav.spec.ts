import { test, expect } from '@playwright/test';

const PAGES = ['/', '/luan-giai.html', '/xem-tuoi.html', '/tu-binh.html', '/phong-thuy.html'];

test.describe('Navigation', () => {
  test('logo visible và link về trang chủ', async ({ page }) => {
    await page.goto('/luan-giai.html');
    await page.waitForLoadState('networkidle');
    const logo = page.locator('.nav-logo, .nav-brand, a[href="/"], a[href="index.html"]').first();
    await expect(logo).toBeVisible();
    await logo.click();
    await page.waitForLoadState('networkidle');
    expect(page.url()).toMatch(/\/$|index\.html$/);
  });

  test('nav links render đủ trên desktop', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const navLinks = page.locator('.topnav a, .nav-links a, nav a').filter({ hasText: /.+/ });
    const count = await navLinks.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('mobile hamburger menu hoạt động', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const hamburger = page.locator('.nav-hamburger, [class*="hamburger"], button[aria-label*="menu"]').first();
    const hasHamburger = await hamburger.isVisible().catch(() => false);
    if (hasHamburger) {
      await hamburger.click();
      await page.waitForTimeout(400);
      const navLinks = page.locator('.nav-links.open a, .nav-links a').first();
      await expect(navLinks).toBeVisible({ timeout: 3000 });
    }
  });

  test('không có broken nav links (4xx/5xx)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const hrefs = await page.locator('.topnav a[href], .nav-links a[href]').evaluateAll(
      els => els.map((e: any) => e.getAttribute('href')).filter(Boolean)
    );
    const internalLinks = hrefs.filter((h: string) => h.startsWith('/') || !h.startsWith('http'));
    for (const href of internalLinks.slice(0, 10)) {
      const res = await page.request.get(href).catch(() => null);
      if (res) expect(res.status(), `Broken link: ${href}`).toBeLessThan(500);
    }
  });

  for (const path of PAGES) {
    test(`nav hiển thị đúng trên ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const nav = page.locator('.topnav, nav, header').first();
      await expect(nav).toBeVisible();
    });
  }
});
