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

  test('tool links render trong main (it nhat 5)', async ({ page }) => {
    const main = page.locator('main, #main-content, .main-content, #portal-content').first();
    const links = main.locator('a[href]');
    await expect(links.first()).toBeVisible({ timeout: 8_000 });
    expect(await links.count()).toBeGreaterThanOrEqual(5);
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
