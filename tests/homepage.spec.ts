import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('hero render', async ({ page }) => {
    await expect(page.locator('h1, .hero-title, .hero h2').first()).toBeVisible();
  });

  test('tabs render', async ({ page }) => {
    await expect(page.locator('.tab-nav button, .tab-btn, [role="tablist"] button').first()).toBeVisible();
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
