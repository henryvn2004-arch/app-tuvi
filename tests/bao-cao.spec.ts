// Trang Báo cáo (`/app/bao-cao`, 2026-09-28): bấm một dòng phải MỞ báo cáo
// trong khung trượt — không quay về form công cụ (Henry báo đúng lỗi đó).
// Stub API: bài này đo trang, không đo dữ liệu thật của tài khoản kiểm thử.
// Ghim `window.Auth` bằng `defineProperty writable:false` — lý do ở
// tests/hard-paywall.spec.ts (auth.js tải sau sẽ đè bản giả nếu không ghim).

import { test, expect, type Page } from '@playwright/test';

const ITEMS = [
  { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', toolId: 'kim-lau', toolLabel: 'Kim Lâu & Tam Tai', title: 'Kim Lâu & Tam Tai',
    subtitle: 'Người Kiểm Thử · Nam · 17/03/1981', hasImage: false, pdfSlug: null, updatedAt: new Date(Date.now() - 3600e3).toISOString() },
  { id: 'lp:at-suu-01-02-1985-nam-gio-dan', toolId: 'luan-giai', toolLabel: 'Luận Giải Lá Số', title: 'Luận Giải Lá Số',
    subtitle: 'zX · 1/2/1985', hasImage: false, pdfSlug: 'at-suu-01-02-1985-nam-gio-dan', updatedAt: new Date(Date.now() - 3 * 864e5).toISOString() },
];

async function setup(page: Page) {
  await page.addInitScript(() => {
    const stub = {
      isLoggedIn: () => true,
      isRestoring: () => false,
      getUser: () => ({ id: 'test-user-id' }),
      getSession: () => ({ access_token: 'FAKE_TOKEN' }),
      getFreshToken: async () => 'FAKE_TOKEN',
      refresh: async () => 'FAKE_TOKEN',
      require: (cb?: () => void) => { if (cb) cb(); },
      signInAnonymously: async () => false,
    };
    Object.defineProperty(window, 'Auth', { value: stub, writable: false, configurable: false });
  });
  // Catch-all ĐỨNG TRƯỚC (page.route đăng ký SAU được ưu tiên).
  await page.route('**/rest/v1/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route('**/api/payment**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"balance":0}' }));
  await page.route('**/api/tuvi-chats**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"chats":[]}' }));
  await page.route('**/api/track**', (r) => r.fulfill({ status: 200, body: '{}' }));
  await page.route('**/api/reports?list=1', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: ITEMS }) }));
  await page.route('**/api/reports/snapshot?id=*', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      id: ITEMS[1].id, title: 'Luận Giải Lá Số', subtitle: 'zX · 1/2/1985',
      blocks: [
        { header: 'Lá số dùng để luận', image: null, text: 'zX · Nam · 01/02/1985 (dương lịch) · giờ Dần' },
        { header: 'Tổng Quan', image: null, text: '**“CÂU HOOK KIỂM THỬ.”** (cách X).\n\nĐOẠN LUẬN KIỂM THỬ.\n\n- ý một\n- ý hai' },
      ],
    }) }));
  await page.goto('/app-bao-cao.html');
}

test('bấm một báo cáo mở khung xem (không sang trang công cụ), Esc đóng', async ({ page }) => {
  await setup(page);
  await expect(page.locator('tr.bc-row')).toHaveCount(2);
  // Chỉ bản cũ biết slug mới có "Gửi PDF".
  await expect(page.locator('.bc-pdf')).toHaveCount(1);
  // …và cạnh nó có "Gửi về Zalo" (gửi PDF vào kênh chat, /api/channels/send-pdf).
  await expect(page.locator('.bc-chat')).toHaveCount(1);

  const url = page.url();
  await page.locator('tr.bc-row').nth(1).click();
  await expect(page.locator('#rvWrap')).toHaveClass(/rv-open/);
  await expect(page.locator('#rvBody')).toContainText('ĐOẠN LUẬN KIỂM THỬ');
  await expect(page.locator('#rvBody strong')).toContainText('CÂU HOOK KIỂM THỬ');
  await expect(page.locator('#rvBody li')).toHaveCount(2);
  expect(page.url().split('#')[0]).toBe(url.split('#')[0]);

  await page.keyboard.press('Escape');
  await expect(page.locator('#rvWrap')).not.toHaveClass(/rv-open/);
});

test('ô tìm lọc theo tên và công cụ', async ({ page }) => {
  await setup(page);
  await page.locator('#bcFind').fill('zx');
  await expect(page.locator('tr.bc-row')).toHaveCount(1);
  await page.locator('#bcFind').fill('kim lâu');
  await expect(page.locator('tr.bc-row')).toHaveCount(1);
  await page.locator('#bcFind').fill('không có gì');
  await expect(page.locator('#bcEmpty')).toBeVisible();
});
