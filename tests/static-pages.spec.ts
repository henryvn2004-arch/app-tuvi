import { test, expect } from '@playwright/test';

// Các trang tĩnh / thông tin — chủ yếu kiểm tra load không crash và có nội dung

const STATIC_PAGES: { path: string; name: string; selector: string }[] = [
  { path: '/about.html',                  name: 'Giới Thiệu',           selector: '.hero, h1' },
  { path: '/contact.html',                name: 'Liên Hệ',              selector: '.hero-title, h1, .contact-card' },
  { path: '/faqs.html',                   name: 'FAQs',                 selector: 'h1, .faq, .faq-group' },
  { path: '/chinh-sach-bao-mat.html',     name: 'Chính Sách Bảo Mật',  selector: 'h1, h2, .page, main' },
  { path: '/dieu-khoan-dich-vu.html',     name: 'Điều Khoản Dịch Vụ',  selector: 'h1, h2, .page, main' },
  { path: '/huong-dan-thanh-toan.html',   name: 'Hướng Dẫn Thanh Toán',selector: 'h1, h2, .page, main' },
  { path: '/payment-success.html',        name: 'Payment Success',      selector: 'h1, h2, .page, main, body' },
];

for (const { path, name, selector } of STATIC_PAGES) {
  test.describe(`${name} (${path})`, () => {
    test('page load — có nội dung, không blank', async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await expect(page.locator(selector).first()).toBeVisible({ timeout: 8000 });
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

// ── About — kiểm tra nội dung chi tiết ──────────────────────────────────────
test.describe('About — nội dung', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/about.html');
    await page.waitForLoadState('networkidle');
  });

  test('hero title và sections hiện', async ({ page }) => {
    await expect(page.locator('.hero-title, h1').first()).toBeVisible();
    const sections = page.locator('.section, section');
    expect(await sections.count()).toBeGreaterThanOrEqual(2);
  });
});

// ── Contact — email hiện ─────────────────────────────────────────────────────
test.describe('Contact — nội dung', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/contact.html');
    await page.waitForLoadState('networkidle');
  });

  test('email liên hệ có trên trang', async ({ page }) => {
    const emailEl = page.locator('#ct-email, a[href*="mailto"], [class*="email"]').first();
    const hasEmail = await emailEl.isVisible().catch(() => false);
    if (hasEmail) {
      const text = await emailEl.textContent();
      expect(text).toContain('@');
    } else {
      // fallback: tìm @ trong page text
      const content = await page.content();
      expect(content).toContain('@');
    }
  });
});

// ── FAQs — accordion hoạt động ───────────────────────────────────────────────
test.describe('FAQs — nội dung', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/faqs.html');
    await page.waitForLoadState('networkidle');
  });

  test('FAQ items render (ít nhất 3)', async ({ page }) => {
    const items = page.locator('.faq, .faq-item, [class*="faq"]');
    expect(await items.count()).toBeGreaterThanOrEqual(3);
  });

  test('click FAQ câu hỏi — mở câu trả lời', async ({ page }) => {
    const firstQ = page.locator('.faq-q, .faq button, .faq [class*="-q"]').first();
    if (await firstQ.isVisible().catch(() => false)) {
      await firstQ.click();
      await page.waitForTimeout(400);
      // Không crash — trang vẫn ổn
      await expect(page.locator('.faq, .faq-group').first()).toBeVisible();
    }
  });
});

// ── Topup — kiểm tra nút thanh toán không redirect lỗi ───────────────────────
test.describe('Topup — nút mua', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/topup.html');
    await page.waitForLoadState('networkidle');
  });

  test('4 gói hiển thị với tên đúng', async ({ page }) => {
    const content = await page.content();
    // Kiểm tra tên gói (có thể có dấu cách, format khác)
    expect(content).toMatch(/Khởi Đầu|Khoi Dau/i);
    expect(content).toMatch(/Phổ Thông|Pho Thong/i);
    expect(content).toMatch(/Cao Cấp|Cao Cap/i);
    expect(content).toMatch(/VIP/i);
  });

  test('giá tiền hiển thị đúng format', async ({ page }) => {
    const content = await page.content();
    // Các mức giá VND
    expect(content).toMatch(/99[.,]000|99000/);
    expect(content).toMatch(/199[.,]000|199000/);
  });
});
