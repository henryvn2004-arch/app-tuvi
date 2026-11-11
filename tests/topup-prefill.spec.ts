// Ô nạp lẻ phải được điền SẴN đúng số tiền còn thiếu khi khách tới từ một tấm
// tường (hard paywall 2026-09-06).
//
// Dưới hard paywall, người gặp tường phần lớn là khách nguội từ quảng cáo vừa
// đọc 2 phần luận về chính mình — bắt họ chọn giữa bốn gói 199k–999k để mua một
// thứ đáng 75k là dựng thêm một quyết định ở đúng bậc cuối phễu.
import { test, expect, type Page } from '@playwright/test';

// W5 (2026-11): PayPal thu USD. Bậc vào cửa 19/350 ≈ $0.05429/Lượng.
// `amount_vnd` giữ trong stub vì cột vẫn còn (rail VNĐ ẩn sau cờ).
const PKGS = [
  { package_id: '50', credits: 350, amount_vnd: 199000, amount_usd: 19, label: 'Khởi Đầu', enabled: true, sort_order: 1 },
  { package_id: '120', credits: 800, amount_vnd: 400000, amount_usd: 39, label: 'Phổ Thông', enabled: true, sort_order: 2 },
];

async function stub(page: Page, pkgs = PKGS, vndRails = false) {
  await page.route('**/rest/v1/**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route('**/rest/v1/credit_packages**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(pkgs) }));
  await page.route('**/rest/v1/tool_pricing**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify([{ tool_id: 'laso', label: 'Luận Giải Lá Số', credits: 150, parts: 13, credits_per_part: 12, is_free: false, sort_order: 1 }]) }));
  await page.route('**/api/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  // Đăng ký SAU catch-all ⇒ được ưu tiên (luật Playwright trong CLAUDE.md).
  await page.route('**/api/payment?action=pay-methods', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ bank: vndRails }) }));
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

  // Bậc vào cửa 19/350 ⇒ 150 Lượng = $8.1429 → làm tròn LÊN cent = $8.15.
  // Làm tròn XUỐNG là thiếu 1 Lượng, khách trả tiền xong vẫn ăn tường.
  expect(val).toBe(8.15);
  expect(Math.floor(val / (19 / 350))).toBeGreaterThanOrEqual(150);
  await expect(page.locator('#customPreview')).toContainText('Lượng');
  await expect(page.locator('#pendingBanner')).toContainText('$8.15');
  await expect(page.locator('#pendingBanner')).not.toContainText(/\dđ/);
});

test('vào thẳng /topup.html: KHÔNG điền gì', async ({ page }) => {
  await stub(page);
  await page.goto('/topup.html');
  await page.waitForTimeout(2500);
  await expect(page.locator('#pendingBanner')).toBeHidden();
  await expect(page.locator('#customInput')).toHaveValue('');
});

test('rail VNĐ: ẩn mặc định, chỉ hiện khi cờ bật', async ({ page }) => {
  await stub(page);
  await page.goto('/topup.html');
  await expect(page.locator('.pkg-card:not(.pkg-skel)').first()).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#mBank')).toBeHidden();
  await expect(page.locator('#packages')).not.toContainText(/\dđ/);
  await expect(page.locator('#packages')).toContainText('$19.00');

  const p2 = await page.context().newPage();
  await stub(p2, PKGS, true);
  await p2.goto('/topup.html');
  await expect(p2.locator('#mBank')).toBeVisible({ timeout: 15000 });
  // Bật rail VNĐ thì CHÍNH rail đó hiện đúng tiền nó thu — không trộn USD.
  await p2.locator('#mBank').click();
  await expect(p2.locator('#packages')).toContainText('199.000đ');
  await expect(p2.locator('#packages')).not.toContainText('$');
});
