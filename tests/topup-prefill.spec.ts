// Ô nạp lẻ phải được điền SẴN đúng số tiền còn thiếu khi khách tới từ một tấm
// tường (hard paywall 2026-09-06).
//
// Dưới hard paywall, người gặp tường phần lớn là khách nguội từ quảng cáo vừa
// đọc 2 phần luận về chính mình — bắt họ chọn giữa bốn gói 199k–999k để mua một
// thứ đáng 75k là dựng thêm một quyết định ở đúng bậc cuối phễu.
import { test, expect, type Page } from '@playwright/test';

// Thang gói TRƯỚC Pha 2 (bậc vào cửa 199.000/250 = 796đ/Lượng).
const PKGS = [
  { package_id: '50', credits: 250, amount_vnd: 199000, label: 'Khởi Đầu', enabled: true, sort_order: 1 },
  { package_id: '120', credits: 600, amount_vnd: 399000, label: 'Phổ Thông', enabled: true, sort_order: 2 },
];

// Thang gói SAU Pha 2 — 1 Lượng ≈ 500đ (_patches/migration-luong-500.sql).
// Giá tiền y hệt, chỉ nhiều Lượng hơn: bậc vào cửa 199.000/350 = 568,6đ/Lượng.
const PKGS_500 = [
  { package_id: '50', credits: 350, amount_vnd: 199000, label: 'Khởi Đầu', enabled: true, sort_order: 1 },
  { package_id: '120', credits: 800, amount_vnd: 399000, label: 'Phổ Thông', enabled: true, sort_order: 2 },
];

async function stub(page: Page, pkgs = PKGS) {
  await page.route('**/rest/v1/**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route('**/rest/v1/credit_packages**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(pkgs) }));
  await page.route('**/rest/v1/tool_pricing**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify([{ tool_id: 'laso', label: 'Luận Giải Lá Số', credits: 150, parts: 13, credits_per_part: 12, is_free: false, sort_order: 1 }]) }));
  await page.route('**/api/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
}

test('tới từ tường: ô nạp lẻ điền sẵn ĐỦ số tiền còn thiếu', async ({ page }) => {
  await stub(page);
  await page.addInitScript(() => {
    sessionStorage.setItem('tpw_pending_unlock', JSON.stringify({
      product: 'laso', slug: 'laso-x', need: 150, cost: 150,
      returnUrl: location.origin + '/app/luan-giai', ts: Date.now(),
    }));
  });
  await page.goto('/topup.html');

  await expect(page.locator('#pendingBanner')).toBeVisible({ timeout: 15000 });
  const val = Number(await page.locator('#customInput').inputValue());

  // Bậc vào cửa 199.000/250 = 796đ/Lượng ⇒ 150 Lượng = 119.400 → làm tròn LÊN
  // nghìn. Làm tròn XUỐNG là thiếu 1 Lượng, khách trả tiền xong vẫn ăn tường.
  expect(val).toBe(120000);
  expect(Math.floor(val / (199000 / 250))).toBeGreaterThanOrEqual(150);
  await expect(page.locator('#customPreview')).toContainText('Lượng');
  await expect(page.locator('#pendingBanner')).toContainText('120.000đ');
});

test('vào thẳng /topup.html: KHÔNG điền gì', async ({ page }) => {
  await stub(page);
  await page.goto('/topup.html');
  await page.waitForTimeout(2500);
  await expect(page.locator('#pendingBanner')).toBeHidden();
  await expect(page.locator('#customInput')).toHaveValue('');
});

test('sau Pha 2 (1 Lượng ≈ 500đ): cùng 150 Lượng chỉ còn 86.000đ', async ({ page }) => {
  await stub(page, PKGS_500);
  await page.addInitScript(() => {
    sessionStorage.setItem('tpw_pending_unlock', JSON.stringify({
      product: 'laso', slug: 'laso-x', need: 150, cost: 150,
      returnUrl: location.origin + '/app/luan-giai', ts: Date.now(),
    }));
  });
  await page.goto('/topup.html');

  await expect(page.locator('#pendingBanner')).toBeVisible({ timeout: 15000 });
  const val = Number(await page.locator('#customInput').inputValue());

  // 150 × (199.000/350 = 568,57đ) = 85.286 → làm tròn LÊN nghìn.
  // Đây là con số cả Pha 2 sinh ra để thay đổi: giá vào cửa của một bản luận
  // cho khách quảng cáo, từ 120.000đ xuống 86.000đ.
  expect(val).toBe(86000);
  expect(Math.floor(val / (199000 / 350))).toBeGreaterThanOrEqual(150);   // đủ trả, không hụt 1 Lượng
});
