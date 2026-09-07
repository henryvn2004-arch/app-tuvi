// Hard paywall — /app/chu-trinh-cuoc-doi, tool anh em của Luận Giải Tử Vi
// (dùng CHUNG backend /api/lasotuvi, phan 14-24).
//
// 🔴 (2026-09-07) Nâng lên mẫu Pha 3: phần 1+2 (local, engine phan 14 "Tổng
// quan đại vận" + 15 "Đại Vận 1") nay có bản xem trước MIỄN PHÍ THẬT — model
// chạy ngay khi vào trang, không cần bấm gì, đúng cơ chế
// `FREE_PHAN_CTCD_MIN/MAX` trong app/api/lasotuvi/route.ts +
// `_runFreePreviewCTCD` trong app-chu-trinh-cuoc-doi.html.
//
// 🔴 (2026-09-07, cùng ngày) Đổi tiếp: BỎ nút "Mở phần này" riêng từng phần
// (9 phần 3-11 không còn `#sec-ai-lock-N`) — chỉ còn ĐÚNG MỘT nút mở cả bó
// (`#lgUnlock`, dời xuống dưới phần 2). 9 phần đó (không phải 10 nữa, vì
// phần 2 đã free) nay hiện văn MẪU (dummy) làm mờ bằng `.tpw-real-lock` —
// CỐ Ý, khác hẳn bug cũ mà bài kiểm này từng canh ("không .tpw-real-lock ở
// đâu cả"). Luật MỚI: `.tpw-real-lock` chỉ được phép xuất hiện trên
// `.claude-content` của phần 3-11 (văn mẫu), TUYỆT ĐỐI không trên khối
// deterministic (`.tpw-ph` vẫn phải rỗng-hoàn-toàn như cũ).

import { test, expect, type Page } from '@playwright/test';

/** Các lượt gọi `/api/lasotuvi` mà stub bắt được, gắn vào chính `page`. */
type PreviewCall = { phan: number; anonId?: string };
type PageWithCalls = Page & { __calls: PreviewCall[] };
const calls = (page: Page): PreviewCall[] => (page as PageWithCalls).__calls;

// Stub ĐẦY ĐỦ shape mà client đọc — thiếu trường thì bài kiểm xanh oan vì nó
// đo đường lùi (CLAUDE.md: "stub thiếu trường ⇒ đo nhầm ĐƯỜNG LÙI mà vẫn xanh").
async function stubApis(page: Page, opts?: { blockPreview?: boolean }) {
  opts = opts || {};
  const recorded: PreviewCall[] = [];
  (page as PageWithCalls).__calls = recorded;

  await page.route('**/rest/v1/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route('**/rest/v1/tool_pricing**', (r) => r.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify([{ tool_id: 'chu-trinh-cuoc-doi', label: 'Chu Trình Cuộc Đời', credits: 250, credits_per_part: 23, parts: 11, is_free: false, sort_order: 1 }]) }));
  await page.route('**/rest/v1/credit_packages**', (r) => r.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify([{ package_id: '50', credits: 350, amount_vnd: 199000, label: 'Khởi Đầu' }]) }));
  await page.route('**/api/payment**', (r) => r.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ hasAccess: false, balance: 0 }) }));
  await page.route('**/api/track**', (r) => r.fulfill({ status: 200, body: '{}' }));
  await page.route('**/api/search', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ docs: '' }) }));

  await page.route('**/api/lasotuvi**', async (r) => {
    const body = JSON.parse(r.request().postData() || '{}');
    recorded.push(body);
    if (opts.blockPreview && body.phan === 14) {
      return r.fulfill({ status: 402, contentType: 'application/json', body: JSON.stringify({ error: 'Đã hết lượt xem trước miễn phí.' }) });
    }
    return r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ luanGiai: '**Chữ AI của phần ' + body.phan + '**\n\nNội dung thật.', chartData: null, phan: body.phan }),
    });
  });
}

// 🔴 CHẠY Ở TRẠNG THÁI CHƯA ĐĂNG NHẬP — cùng lý do đã ghi trong
// tests/hard-paywall.spec.ts: `_renderUnlockBlock` rẽ hai nhánh khác hẳn theo
// `_lgLoggedIn()`, mặc định storageState của CI là ĐÃ đăng nhập.
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

// Khách ĐÃ đăng ký từ trước (không phải khách vô danh vừa đăng ký giữa
// chừng) nhưng chưa trả tiền cho ĐÚNG lá số này — `buildPhanSection`'s
// `locked` chỉ tra ĐĂNG NHẬP (`p>1&&!loggedIn`), không tra thanh toán, nên
// DOM đã hiện đủ 11 phần deterministic KHÔNG khoá ngay từ lượt render đầu.
// Cần biến RIÊNG (không dùng `run`) vì `window.Auth` bị ghim
// `writable:false` — không lật được sau khi trang đã tải.
async function runLoggedIn(page: Page) {
  await page.addInitScript(() => {
    const loggedIn = {
      isLoggedIn: () => true,
      isRestoring: () => false,
      getUser: () => ({ id: 'test-user-1' }),
      getSession: () => ({ access_token: 'test-token' }),
      getFreshToken: async () => 'test-token',
      refresh: async () => null,
      require: (cb?: () => void) => { cb?.(); },
      signInAnonymously: async () => false,
    };
    Object.defineProperty(window, 'Auth', { value: loggedIn, writable: false, configurable: false });
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

test('phần 1+2 (engine 14+15) sinh chữ AI THẬT tự động, không cần bấm gì', async ({ page }) => {
  await stubApis(page);
  await run(page);
  await expect(page.locator('#claude-content-14')).toContainText('Chữ AI của phần 14', { timeout: 15000 });
  await expect(page.locator('#claude-content-15')).toContainText('Chữ AI của phần 15', { timeout: 15000 });

  // Đúng 2 lượt gọi model (phần 1+2), TUẦN TỰ, cả hai đều mang anonId — cầu
  // dao xem trước tính theo anonId cho khách chưa đăng nhập.
  const parts = calls(page).map((c) => c.phan);
  expect(parts).toEqual([14, 15]);
  expect(calls(page)[0].anonId).toBeTruthy();
  expect(calls(page)[1].anonId).toBeTruthy();
});

test('phần 1+2 không còn khoá-mini (đã free) — 9 phần còn lại khoá cứng + văn mẫu MỜ, không nút riêng', async ({ page }) => {
  await stubApis(page);
  await run(page);
  await expect(page.locator('#claude-content-14')).toContainText('Chữ AI', { timeout: 15000 });
  await expect(page.locator('#claude-content-15')).toContainText('Chữ AI', { timeout: 15000 });

  // Phần 1+2: không có gì để mời mua nữa.
  for (const p of [1, 2]) {
    await expect(page.locator(`#sec-${p} .tpw-ph`)).toHaveCount(0);
    await expect(page.locator(`#sec-${p} .tpw-lock-badge`)).toHaveCount(0);
    await expect(page.locator(`#sec-${p} .claude-content`)).not.toHaveClass(/tpw-real-lock/);
  }

  // 9 phần (3-11) đều có ô giữ chỗ (khối tính toán — rỗng hoàn toàn, luật cũ
  // "che hết luôn" giữ nguyên) + huy hiệu khoá — nhưng KHÔNG còn nút
  // "Mở phần này" riêng (Henry 2026-09-07: bỏ hẳn mở-từng-mục).
  for (let p = 3; p <= 11; p++) {
    await expect(page.locator(`#sec-${p} .tpw-ph`)).toBeVisible();
    await expect(page.locator(`#sec-${p} .tpw-lock-badge`)).toBeVisible();
    await expect(page.locator(`#sec-ai-lock-${p}`)).toHaveCount(0);
    // Văn MẪU (dummy) hiện SẴN, làm mờ — không phải ô rỗng như khối tính
    // toán. Đây là thiết kế MỚI, khác hẳn bug Pha 1 cũ (làm mờ NỘI DUNG THẬT
    // của chính người đang xem) — văn mẫu KHÔNG thuộc về lá số đang xem.
    const cc = page.locator(`#sec-${p} .claude-content`);
    await expect(cc).toHaveClass(/tpw-real-lock/);
    await expect(cc).not.toBeEmpty();
  }

  expect(await page.locator('#lgBody .tpw-ph').count()).toBe(9);
  expect(await page.locator('#lgBody [id^="sec-ai-lock-"]').count()).toBe(0);
  expect(await page.locator('.tpw-real-lock').count()).toBe(9);
});

test('tường đứng NGAY DƯỚI phần 2, có giá', async ({ page }) => {
  await stubApis(page);
  await run(page);
  await expect(page.locator('#lgUnlock .tpw-lock')).toBeVisible();
  await expect(page.locator('#lgUnlock')).toContainText('250 Lượng');
  await expect(page.locator('.tpw-overlay')).toHaveCount(0);

  const order = await page.evaluate(() => {
    const ids = ['sec-1', 'sec-2', 'lgUnlock', 'sec-3'];
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
  expect(calls(page).map((c) => c.phan)).toEqual([14]);
  await expect(page.locator('#claude-content-14')).toBeHidden();
  await expect(page.locator('#lgUnlock')).toBeVisible();
  await expect(page.locator('.laso-error')).toHaveCount(0);
});

test('trả tiền xong: KHÔNG sinh lại phần 1+2 đã đọc free, tường không bị xoá', async ({ page }) => {
  await stubApis(page);
  await runLoggedIn(page);
  await expect(page.locator('#claude-content-14')).toContainText('Chữ AI', { timeout: 15000 });
  // PHẢI chờ ĐỦ CẢ phần 2 (gọi TUẦN TỰ sau phần 1, xem `_runFreePreviewCTCD`)
  // trước khi xoá `calls` — chờ thiếu là đua nước rút: lượt gọi phần 15 có
  // thể rơi vào SAU dòng xoá, lẫn vào mảng `parts` bên dưới rồi báo sai ngẫu
  // nhiên (flaky), không liên quan gì tới thứ bài kiểm này thật sự muốn đo.
  await expect(page.locator('#claude-content-15')).toContainText('Chữ AI', { timeout: 15000 });
  calls(page).length = 0;

  // Bỏ qua requireCredits (đường tiền có bài kiểm riêng) — cái cần đo ở đây
  // là chuyện xảy ra SAU khi trừ tiền thành công.
  await page.evaluate(() => (window as unknown as { _startLuanGiaiAI(): Promise<void> })._startLuanGiaiAI());
  await page.waitForFunction(() => /hoàn tất|lỗi/.test(document.getElementById('lgProgress')!.textContent!), { timeout: 30000 });

  const parts = calls(page).map((c) => c.phan).sort((a, b) => a - b);
  expect(parts).toEqual([16, 17, 18, 19, 20, 21, 22, 23, 24]); // 14+15 KHÔNG chạy lại

  await expect(page.locator('#lgUnlock')).toHaveCount(1);
  await expect(page.locator('#claude-content-14')).toContainText('Chữ AI của phần 14');
  await expect(page.locator('#lgBody .tpw-ph')).toHaveCount(0); // hết ô giữ chỗ
  // Văn MẪU (dummy) của phần 3-11 đã bị chữ THẬT ghi đè — không còn khối nào
  // làm mờ nữa.
  await expect(page.locator('.tpw-real-lock')).toHaveCount(0);
});
