// Hard paywall — luồng khách từ quảng cáo trên /app/luan-giai (2026-09-06).
//
// KHÔNG gọi model thật: mọi API bị `page.route` chặn và trả shape đầy đủ, nên
// bài kiểm chạy được trên preview/prod mà không tốn một đồng token nào và không
// đụng vào `preview.free_runs` của người thật.
//
// ⚠️ Stub bảng giá PHẢI có dữ liệu thật: đọc hụt giá thì paywall fail-closed,
// `lockPreview` bỏ dựng tường — mà `#lgUnlock` là div rỗng khai sẵn trong HTML
// nên mọi assert "tường tồn tại" vẫn xanh. Đó là đo nhầm đường lùi.
//
// ⚠️ CỐ Ý KHÔNG giả cờ `navigator.webdriver`: để `track.js` tự no-op đúng như
// khi người thật chặn đo. Định danh cho cầu dao xem trước phải sống được trong
// ca đó (xem `_previewAnonId` trong app-luan-giai.html) — chính bài kiểm này
// bắt được lỗi khi nó còn đọc `Track.anonId`.

import { test, expect, type Page } from '@playwright/test';

// 🔴 CHẠY Ở TRẠNG THÁI CHƯA ĐĂNG NHẬP — bắt buộc, không phải cho tiện.
// `playwright.config.ts` gắn `storageState: tests/.auth/user.json` cho project
// chromium, tức mặc định MỌI bài kiểm chạy như người ĐÃ đăng nhập. Nhưng luồng
// PR này dựng ra là cho khách nguội từ quảng cáo, và `_renderUnlockBlock` rẽ
// HAI nhánh khác hẳn nhau theo `_lgLoggedIn()`: đã đăng nhập → một nút phẳng;
// chưa → `TuviPaywall.lockPreview` dựng `.tpw-lock`. Để mặc định thì bài kiểm
// đo nhánh KHÔNG phải nhánh đang nói tới, và assert `.tpw-lock` đỏ trên CI
// trong khi xanh ở máy (máy không có phiên đăng nhập nào).

/** Các lượt gọi `/api/lasotuvi` mà stub bắt được, gắn vào chính `page`. */
type PreviewCall = { phan: number; anonId?: string };
type PageWithCalls = Page & { __calls: PreviewCall[] };
const calls = (page: Page): PreviewCall[] => (page as PageWithCalls).__calls;

// Stub ĐẦY ĐỦ shape mà client đọc — stub thiếu trường thì bài kiểm xanh oan vì
// nó đo đường lùi chứ không đo đường thật (bẫy đã ghi trong CLAUDE.md).
async function stubApis(page: Page, opts?: { blockPreview?: boolean }) {
  opts = opts || {};
  const recorded: PreviewCall[] = [];
  (page as PageWithCalls).__calls = recorded;

  // Catch-all ĐỨNG TRƯỚC (page.route đăng ký SAU được ưu tiên).
  await page.route('**/rest/v1/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  // 🪤 Bảng giá phải trả DỮ LIỆU THẬT: đọc hụt giá thì paywall fail-closed —
  // `lockPreview` bỏ dựng tường và mở hộp "Chưa đọc được bảng giá". Bài kiểm
  // vẫn xanh vì `#lgUnlock` là div rỗng có sẵn ⇒ đo nhầm đường lùi.
  await page.route('**/rest/v1/tool_pricing**', (r) => r.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify([{ tool_id: 'laso', label: 'Luận Giải Lá Số', credits: 150, credits_per_part: 12, parts: 13, is_free: false, sort_order: 1 }]) }));
  await page.route('**/rest/v1/credit_packages**', (r) => r.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify([{ package_id: '50', credits: 250, amount_vnd: 199000, label: 'Khởi Đầu' }]) }));
  await page.route('**/api/search', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ docs: '' }) }));
  await page.route('**/api/payment**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ hasAccess: false, balance: 0 }) }));
  await page.route('**/api/track**', (r) => r.fulfill({ status: 200, body: '{}' }));

  await page.route('**/api/lasotuvi**', async (r) => {
    const body = JSON.parse(r.request().postData() || '{}');
    recorded.push(body);
    if (opts.blockPreview && body.phan <= 2) {
      return r.fulfill({ status: 402, contentType: 'application/json', body: JSON.stringify({ error: 'Đã hết lượt xem trước miễn phí.' }) });
    }
    return r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ luanGiai: '**Chữ AI của phần ' + body.phan + '**\n\nNội dung thật.', chartData: null, phan: body.phan }),
    });
  });
}

async function run(page: Page) {
  // KHÔNG giả cờ webdriver: để track.js no-op ĐÚNG như khi người thật chặn đo.
  // Đây chính là ca phải chạy được — anonId của paywall không được phụ thuộc Track.
  await page.goto('/app-luan-giai.html');
  // Điền qua `TuviForm.setData` chứ không gõ vào từng ô: ngày/tháng/năm là
  // <select> do tuvi-form.js dựng, và hình dạng form đó đổi thì bài kiểm gãy vì
  // một lý do chẳng liên quan gì tới paywall.
  await page.waitForFunction(() => {
    const w = window as unknown as { TuviForm?: unknown; doLuan?: unknown };
    return !!w.TuviForm && typeof w.doLuan === 'function';
  });
  await page.evaluate(() => {
    const w = window as unknown as {
      TuviForm: { setData(d: Record<string, unknown>): void };
      doLuan(): void;
    };
    w.TuviForm.setData({ hoten: 'Kiểm Thử', gioitinh: 'nam', ngay: 15, thang: 6, nam: 1990, gioHour: 9, gioPhut: 0, gioIdx: 5 });
    w.doLuan();
  });
  await page.waitForSelector('#lgBody .sec', { timeout: 15000 });
}

test.use({ storageState: { cookies: [], origins: [] } });

test('bản mẫu KHÔNG tự mở, form đứng trên cùng', async ({ page }) => {
  await stubApis(page);
  await page.goto('/app-luan-giai.html');
  await page.waitForTimeout(1500);
  await expect(page.locator('#birthPanel')).toBeVisible();
  await expect(page.locator('#sampBar')).toHaveCount(0);
  await expect(page.locator('#sampCta')).toBeVisible();
});

test('phần 1-2 sinh chữ THẬT, phần 3+ chỉ còn ô giữ chỗ', async ({ page }) => {
  await stubApis(page);
  await run(page);
  await expect(page.locator('#claude-content-1')).toContainText('Chữ AI của phần 1', { timeout: 15000 });
  await expect(page.locator('#claude-content-2')).toContainText('Chữ AI của phần 2', { timeout: 15000 });

  // Đúng 2 lượt gọi model, đúng phần 1 và 2, có mang anonId.
  const parts = calls(page).map((c: PreviewCall) => c.phan).sort();
  expect(parts).toEqual([1, 2]);
  expect(calls(page)[0].anonId).toBeTruthy();

  // Phần 3+: ô giữ chỗ, KHÔNG chữ thật nào lọt vào DOM.
  await expect(page.locator('#sec-3 .lg-ph')).toBeVisible();
  const sec3 = await page.locator('#sec-3 .card').innerText();
  expect(sec3).not.toMatch(/\/10/);
  expect(await page.locator('#lgBody .lg-ph').count()).toBe(11);
});

test('tường + câu căng thẳng đứng NGAY DƯỚI phần 2', async ({ page }) => {
  await stubApis(page);
  await run(page);
  await expect(page.locator('#lgTension')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#lgTension')).toContainText('/10');
  // Tường phải DỰNG THẬT, không phải cái div rỗng khai sẵn trong HTML.
  await expect(page.locator('#lgUnlock .tpw-lock')).toBeVisible();
  await expect(page.locator('#lgUnlock')).toContainText('150 Lượng');   // khách vô danh cũng phải thấy GIÁ
  await expect(page.locator('.tpw-overlay')).toHaveCount(0);   // không có hộp "chưa đọc được bảng giá"

  const order = await page.evaluate(() => {
    const ids = ['sec-2', 'lgTension', 'lgUnlock', 'sec-3'];
    const els = ids.map((i) => document.getElementById(i));
    if (els.some((e) => !e)) return 'MISSING';
    const seq = els as HTMLElement[];
    return seq.every((e, i) => i === 0 || !!(seq[i - 1].compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING))
      ? 'OK' : 'SAI THỨ TỰ';
  });
  expect(order).toBe('OK');
});

test('cầu dao chặn xem trước → im lặng, tường vẫn nguyên', async ({ page }) => {
  await stubApis(page, { blockPreview: true });
  await run(page);
  await page.waitForTimeout(1200);
  // Hỏng phần 1 thì KHÔNG đốt tiếp phần 2.
  expect(calls(page).map((c: PreviewCall) => c.phan)).toEqual([1]);
  await expect(page.locator('#claude-content-1')).toBeHidden();
  await expect(page.locator('#lgUnlock')).toBeVisible();
  await expect(page.locator('.laso-error')).toHaveCount(0);
});

test('trả tiền xong: KHÔNG sinh lại phần đã đọc free, tường không bị xoá', async ({ page }) => {
  await stubApis(page);
  await page.route('**/api/save-laso', (r) => r.fulfill({ status: 200, body: '{}' }));
  await run(page);
  await expect(page.locator('#claude-content-2')).toContainText('Chữ AI của phần 2', { timeout: 15000 });
  calls(page).length = 0;

  // Bỏ qua requireCredits (đã có bài kiểm riêng cho đường tiền) — cái cần đo ở
  // đây là chuyện xảy ra SAU khi trừ tiền thành công.
  await page.evaluate(() => (window as unknown as { _startLuanGiaiAI(): Promise<void> })._startLuanGiaiAI());
  await page.waitForFunction(() => /hoàn tất|lỗi/.test(document.getElementById('lgProgress')!.textContent!), { timeout: 30000 });

  const parts = calls(page).map((c: PreviewCall) => c.phan).sort((a: number, b: number) => a - b);
  expect(parts).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);   // 1 và 2 KHÔNG chạy lại

  // renderLuan(...,true) ghi đè #lgBody — hai node tĩnh phải sống sót.
  await expect(page.locator('#lgUnlock')).toHaveCount(1);
  await expect(page.locator('#lgTension')).toHaveCount(1);
  await expect(page.locator('#claude-content-1')).toContainText('Chữ AI của phần 1');
  await expect(page.locator('#claude-content-2')).toContainText('Chữ AI của phần 2');
  await expect(page.locator('#lgBody .lg-ph')).toHaveCount(0);    // hết ô giữ chỗ
});
