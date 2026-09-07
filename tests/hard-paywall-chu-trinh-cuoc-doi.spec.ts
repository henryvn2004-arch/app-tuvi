// Hard paywall — /app/chu-trinh-cuoc-doi, tool anh em của Luận Giải Tử Vi
// (dùng CHUNG backend /api/lasotuvi, phan 14-24).
//
// Phạm vi bài kiểm này HẸP HƠN các file hard-paywall-*.spec.ts khác: đây
// KHÔNG phải chuyển sang mẫu Pha 3 (chưa có hạ tầng ngân sách/cầu dao RIÊNG
// cho tool này — xem chú thích trong app/api/lasotuvi/route.ts, "Đừng đổi
// điều kiện... nếu chưa dựng cầu dao/ngân sách riêng"). Phạm vi ở đây CHỈ là
// vá lại bug "làm mờ nội dung miễn phí" — `.tpw-real-lock` từng phủ lên chính
// phần deterministic (cách cục/điểm số) của 10/11 phần, y hệt lỗi đã sửa ở
// app-luan-giai.html (Pha 1) nhưng trang này bị bỏ sót. Đường tiền (0 phần
// AI nào free) giữ NGUYÊN — bài kiểm không đụng tới đó.

import { test, expect, type Page } from '@playwright/test';

async function stubApis(page: Page) {
  await page.route('**/rest/v1/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route('**/rest/v1/tool_pricing**', (r) => r.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify([{ tool_id: 'chu-trinh-cuoc-doi', label: 'Chu Trình Cuộc Đời', credits: 250, credits_per_part: 23, parts: 11, is_free: false, sort_order: 1 }]) }));
  await page.route('**/rest/v1/credit_packages**', (r) => r.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify([{ package_id: '50', credits: 350, amount_vnd: 199000, label: 'Khởi Đầu' }]) }));
  await page.route('**/api/payment**', (r) => r.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ hasAccess: false, balance: 0 }) }));
  await page.route('**/api/track**', (r) => r.fulfill({ status: 200, body: '{}' }));
  await page.route('**/api/search', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ docs: '' }) }));
  await page.route('**/api/lasotuvi**', (r) => r.fulfill({ status: 402, contentType: 'application/json',
    body: JSON.stringify({ error: 'Lượt dùng này chưa được thanh toán.' }) }));
}

async function run(page: Page) {
  await page.addInitScript(() => {
    const loggedOut = {
      isLoggedIn: () => false,
      isRestoring: () => false,
      getUser: () => null,
      getSession: () => null,
      getFreshToken: async () => null,
      refresh: async () => null,
      require: (cb?: () => void) => { void cb; },
      signInAnonymously: async () => false,
    };
    Object.defineProperty(window, 'Auth', { value: loggedOut, writable: false, configurable: false });
  });
  await page.goto('/app-chu-trinh-cuoc-doi.html');
  await page.waitForFunction(() => {
    const w = window as unknown as { TuviForm?: unknown; doLuan?: unknown };
    return !!w.TuviForm && typeof w.doLuan === 'function';
  });
  await page.evaluate(() => {
    const w = window as unknown as { TuviForm: { setData(d: Record<string, unknown>): void }; doLuan(): void };
    w.TuviForm.setData({ hoten: 'Kiểm Thử', gioitinh: 'nam', ngay: 15, thang: 6, nam: 1990, gioHour: 9, gioPhut: 0, gioIdx: 5 });
    w.doLuan();
  });
  await page.waitForSelector('#sec-1', { timeout: 15000 });
}

test('phần 1 (tổng quan đại vận) hiện RÕ cơ sở tính toán, không khoá', async ({ page }) => {
  await stubApis(page);
  await run(page);
  await expect(page.locator('#sec-1 .tpw-ph')).toHaveCount(0);
  await expect(page.locator('#sec-1 .tpw-lock-badge')).toHaveCount(0);
});

test('10 phần còn lại: ô giữ chỗ thật, KHÔNG một chữ cách cục nào lọt ra — bỏ hẳn .tpw-real-lock', async ({ page }) => {
  await stubApis(page);
  await run(page);

  // 10 phần (2-11) đều có ô giữ chỗ + huy hiệu khoá.
  for (let p = 2; p <= 11; p++) {
    await expect(page.locator(`#sec-${p} .tpw-ph`)).toBeVisible();
    await expect(page.locator(`#sec-${p} .tpw-lock-badge`)).toBeVisible();
  }

  // Bug đã sửa: không còn khối nào dùng cách làm mờ cũ.
  await expect(page.locator('.tpw-real-lock')).toHaveCount(0);

  // Không có khối "cơ sở tính toán" (cách cục/điểm số thật) nào rò ra ngoài
  // phần 1 — đếm PHẦN TỬ DOM thật (`details.lg-calc`), không phải đếm chuỗi:
  // "lg-calc" còn xuất hiện trong chính khối `<style>` (định nghĩa CSS class),
  // đếm chuỗi thô sẽ cộng nhầm 4 dòng CSS vào con số.
  const calcBlocks = await page.locator('details.lg-calc').count();
  expect(calcBlocks).toBeLessThanOrEqual(1); // đúng 1 (phần 1), 0 nếu phần 1 không có pre-gen
});

test('tường mở khoá đứng đúng chỗ, có giá', async ({ page }) => {
  await stubApis(page);
  await run(page);
  await expect(page.locator('#lgUnlock .tpw-lock')).toBeVisible();
  await expect(page.locator('#lgUnlock')).toContainText('250 Lượng');
  await expect(page.locator('.tpw-overlay')).toHaveCount(0);
});
