import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('hero render', async ({ page }) => {
    await expect(page.locator('h1, .hero-title')).toBeVisible();
  });

  test('tabs render (ít nhất 3)', async ({ page }) => {
    const tabs = page.locator('.tab-nav button, [role="tablist"] button, .tabs a').first();
    await expect(tabs).toBeVisible();
  });

  test('tool cards render (ít nhất 10)', async ({ page }) => {
    const cards = page.locator('.tool-card, a.card, [class*="tool-card"]');
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThanOrEqual(10);
  });

  test('không có JS errors nghiêm trọng', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const critical = errors.filter(e => !e.includes('favicon') && !e.includes('fonts.google') && !e.includes('Sentry'));
    expect(critical).toHaveLength(0);
  });
});
