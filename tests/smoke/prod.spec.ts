import { test, expect } from '@playwright/test';

// Smoke test trên URL đang chạy thật — sau deploy (prod + preview) hoặc cron fallback mỗi 6h.
// Mục tiêu: phát hiện regression high-impact (homepage chết, paywall sập, sitemap hỏng).
// KHÔNG verify nội dung sâu để tránh tốn Claude API / Supabase quota.
//
// ⚠️ Các ca gọi API dùng FIXTURE `request` (tham số của test), KHÔNG dùng
// `request.newContext()` tự tạo: chỉ fixture mới thừa hưởng `use` của config,
// tức baseURL VÀ `extraHTTPHeaders` mang secret bypass SSO. Context tự tạo thì
// không có header đó → trên preview mấy ca này ăn 401 trong khi ca `page.goto`
// vẫn xanh, một kiểu đỏ rất khó lần ra.

test.describe('Prod smoke @smoke', () => {
  test('homepage render + meta tags chính', async ({ page }) => {
    const resp = await page.goto('/');
    expect(resp?.status(), 'homepage status').toBeLessThan(400);
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveTitle(/Tử Vi|Minh Bảo|tuviminhbao/i);

    const desc = page.locator('meta[name="description"]');
    await expect(desc).toHaveCount(1);
    const descContent = await desc.getAttribute('content');
    expect(descContent, 'meta description').toBeTruthy();
    expect(descContent!.length).toBeGreaterThan(30);

    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveCount(1);

    const hero = page.locator('h1, .hero-title, .hero h2').first();
    await expect(hero).toBeVisible();
  });

  test('form lập lá số render đầy đủ', async ({ page }) => {
    const resp = await page.goto('/la-so.html');
    expect(resp?.status(), 'la-so.html status').toBeLessThan(400);
    await page.waitForLoadState('domcontentloaded');

    // Các field bắt buộc của form (KHÔNG submit thật để tránh tốn Claude API)
    await expect(page.locator('#inp-name')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#inp-gender')).toBeVisible();
    await expect(page.locator('#inp-dd')).toBeVisible();
    await expect(page.locator('#inp-mm')).toBeVisible();
    await expect(page.locator('#inp-yyyy')).toBeVisible();
    await expect(page.locator('#inp-hh')).toBeVisible();
  });

  test('luan-giai.html: paywall block đúng khi chưa pay', async ({ page, context }) => {
    // Clear cookies/storage để mô phỏng user chưa pay
    await context.clearCookies();

    const resp = await page.goto('/luan-giai.html');
    expect(resp?.status(), 'luan-giai.html status').toBeLessThan(400);
    await page.waitForLoadState('domcontentloaded');

    // Paywall overlay phải hiện HOẶC trang redirect sang la-so.html
    const url = page.url();
    if (!url.includes('luan-giai.html')) {
      // Redirected — OK
      expect(url).toMatch(/la-so|index|tuviminhbao\.com\/?$/);
      return;
    }

    // Hoặc paywall modal hiện
    const paywall = page
      .locator('.tpw-overlay, .paywall, [class*="paywall"], [data-paywall]')
      .first();
    const paywallVisible = await paywall.isVisible({ timeout: 5_000 }).catch(() => false);
    const lockedContent = page.locator('text=/đăng nhập|mua|unlock|trả phí/i').first();
    const lockedVisible = await lockedContent.isVisible({ timeout: 2_000 }).catch(() => false);

    expect(paywallVisible || lockedVisible, 'paywall hoặc CTA mua phải hiện').toBe(true);
  });

  test('paywall module (tuvi-paywall.js) load được', async ({ page, request }) => {
    await page.goto('/luan-giai.html');
    await page.waitForLoadState('domcontentloaded');

    // PayPal SDK lazy-load — chỉ inject khi paywall trigger. Smoke check phải
    // tránh thật sự click mua. Verify tuvi-paywall.js (module wrapper) tồn tại
    // và TuviPaywall global accessible.
    const hasPaywallScript = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'));
      return scripts.some((s) => (s as HTMLScriptElement).src?.includes('tuvi-paywall'));
    });
    expect(hasPaywallScript, 'tuvi-paywall.js script tag tồn tại').toBe(true);

    // 200 OK trên asset
    const resp = await request.get('/tuvi-paywall.js');
    expect(resp.status(), 'tuvi-paywall.js 200').toBeLessThan(400);
  });

  test('/sitemap.xml accessible + valid XML', async ({ request }) => {
    const resp = await request.get('/sitemap.xml');
    expect(resp.status(), 'sitemap.xml status').toBe(200);

    const body = await resp.text();
    expect(body, 'XML declaration').toMatch(/^<\?xml/);
    expect(body, 'urlset tag').toMatch(/<urlset|<sitemapindex/);
    expect(body, '<loc> tag').toMatch(/<loc>/);

    const ct = resp.headers()['content-type'] || '';
    expect(ct).toMatch(/xml/);
  });

  test('3 SEO landing pages load 200', async ({ request }) => {
    // Hardcoded popular SEO slugs — không đi qua DB để giữ smoke đơn giản
    const slugs = ['/menh-kho.html', '/kien-thuc-tuvi.html', '/blog.html'];

    for (const slug of slugs) {
      const resp = await request.get(slug);
      expect(resp.status(), `${slug} status`).toBeLessThan(400);
      const body = await resp.text();
      expect(body.length, `${slug} body length`).toBeGreaterThan(500);
    }
  });

  test('robots.txt + llms.txt accessible', async ({ request }) => {
    const robots = await request.get('/robots.txt');
    expect(robots.status(), 'robots.txt').toBe(200);
    expect(await robots.text()).toMatch(/User-agent|Sitemap/i);

    const llms = await request.get('/llms.txt');
    expect(llms.status(), 'llms.txt').toBe(200);
  });
});
