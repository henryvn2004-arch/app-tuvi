// Hard paywall — /app/van-han-nam (Vận Hạn 12 Tháng Tới).
//
// KHÔNG gọi model thật: mọi API bị `page.route` chặn và trả shape đầy đủ, nên
// bài kiểm chạy được trên preview/prod mà không tốn một đồng token nào.
//
// Trọng tâm: trang này là MULTI-PAGE (điều hướng CỨNG sang /topup.html rồi
// quay lại `?tpwResume=1`), khác Chân Dung Tiền Kiếp (SPA, không rời trang).
// Bài kiểm cuối cùng ở đây đo ĐÚNG bản vá 2026-09-08: trước đó khách đã đăng
// nhập, hết Lượng ngay lúc mở khoá, đi nạp xong quay lại gặp lại form TRỐNG
// và phải bấm "Xem vận hạn" + mở khoá LẦN NỮA — `VH_RESUME_KEY` (lưu form) +
// `TuviPaywall.resumeIfPending` (tự trừ tiền + chạy tiếp) phải xoá bỏ cả hai
// bước tay đó.
//
// Xem tests/hard-paywall.spec.ts để biết vì sao phải ghim `window.Auth` bằng
// `defineProperty writable:false` thay vì xoá storageState.

import { test, expect, type Page } from '@playwright/test';

const COST = 150;
const BIRTH = { hoten: 'Kiểm Thử', gioitinh: 'nam', ngay: 15, thang: 6, nam: 1990, gioHour: 9, gioPhut: 0, gioIdx: 5 };

/** Khung 12 tháng — shape tối thiểu mà `render()`/`renderThang()` cần, không
 *  dùng nhánh rút gọn `t.loi` để bài kiểm chạm được đúng đường vẽ thật. */
function khungFixture() {
  const thangs = Array.from({ length: 12 }, (_, i) => ({
    loi: null,
    nhan: 'Tháng ' + (i + 1),
    nhanDay: 'Tháng ' + (i + 1) + ' ÂL',
    namAL: 2026,
    thangAL: i + 1,
    isLeap: false,
    duongTu: '01/0' + ((i % 9) + 1) + '/2026',
    duongDen: '28/0' + ((i % 9) + 1) + '/2026',
    soNgay: 28,
    dangDienRa: i === 0,
    cungNguyetHan: 'Tý',
    chinhTinh: ['Tử Vi'],
    catTinh: [],
    satTinh: [],
    baiTinh: [],
    tuoi: 30,
    cungTieuHan: 'Tý',
    cungLuuNien: 'Tý',
    toHop: [],
  }));
  return {
    khung: { tuNhan: 'Tháng Giêng', denNhan: 'Tháng Chạp', duongTu: '01/01/2026', duongDen: '31/12/2026', thangs },
    labels: Array.from({ length: 17 }, (_, i) => 'Phần ' + i),
    tongPhan: 16,
    dvHienTai: 1,
  };
}

type Balance = { value: number };

async function stubApis(page: Page, bal: Balance) {
  await page.route('**/rest/v1/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route('**/rest/v1/tool_pricing**', (r) => r.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify([{ tool_id: 'van-han-nam', label: 'Vận Hạn 12 Tháng Tới', credits: COST, is_free: false, sort_order: 1 }]) }));
  await page.route('**/rest/v1/credit_packages**', (r) => r.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify([{ package_id: '50', credits: 350, amount_vnd: 199000, label: 'Khởi Đầu' }]) }));
  await page.route('**/api/search', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ docs: '' }) }));
  await page.route('**/api/track**', (r) => r.fulfill({ status: 200, body: '{}' }));

  await page.route('**/api/payment**', (r) => {
    const url = new URL(r.request().url());
    const action = url.searchParams.get('action');
    if (action === 'check') return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ hasAccess: false }) });
    if (action === 'balance') return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ balance: bal.value }) });
    if (action === 'deduct') {
      if (bal.value < COST) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ insufficientBalance: true }) });
      bal.value -= COST;
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, balance: bal.value }) });
    }
    return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  const phanCalls: number[] = [];
  await page.route('**/api/van-han-nam**', async (r) => {
    const url = new URL(r.request().url());
    if (url.searchParams.get('action') === 'khung') {
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(khungFixture()) });
    }
    const body = JSON.parse(r.request().postData() || '{}');
    phanCalls.push(body.phan);
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ luanGiai: 'Chữ AI phần ' + body.phan }) });
  });
  (page as Page & { __phanCalls: number[] }).__phanCalls = phanCalls;
}
const phanCalls = (page: Page) => (page as Page & { __phanCalls: number[] }).__phanCalls;

async function pinAuth(page: Page, kind: 'anon' | 'loggedIn') {
  await page.addInitScript((k) => {
    if (k === 'loggedIn') {
      const stub = {
        isLoggedIn: () => true, isRestoring: () => false,
        getUser: () => ({ id: 'test-user-id' }), getSession: () => ({ access_token: 'FAKE_TOKEN' }),
        getFreshToken: async () => 'FAKE_TOKEN', refresh: async () => 'FAKE_TOKEN',
        require: (cb?: () => void) => { if (cb) cb(); },
        isAnonymous: () => false,
        signInAnonymously: async () => false,
      };
      Object.defineProperty(window, 'Auth', { value: stub, writable: false, configurable: false });
      return;
    }
    // Khách vô danh — `signInAnonymously` mô phỏng guest checkout THẬT: mở
    // một phiên ẩn danh (đổi `isLoggedIn`/`isAnonymous` sang true) đúng như
    // Supabase Anonymous Sign-in làm ở `auth.js`, KHÔNG chỉ trả `true` suông.
    let signedIn = false;
    (window as unknown as { __signInAnonCalls: number }).__signInAnonCalls = 0;
    const stub = {
      isLoggedIn: () => signedIn, isRestoring: () => false,
      getUser: () => (signedIn ? { id: 'anon-uid' } : null),
      getSession: () => (signedIn ? { access_token: 'ANON_TOKEN' } : null),
      getFreshToken: async () => (signedIn ? 'ANON_TOKEN' : null),
      refresh: async () => null,
      require: (cb?: () => void) => { void cb; },
      isAnonymous: () => signedIn,
      signInAnonymously: async () => {
        (window as unknown as { __signInAnonCalls: number }).__signInAnonCalls++;
        signedIn = true;
        return true;
      },
    };
    Object.defineProperty(window, 'Auth', { value: stub, writable: false, configurable: false });
  }, kind);
}

async function fillAndRun(page: Page) {
  await page.goto('/app-van-han-nam.html');
  await page.waitForFunction(() => {
    const w = window as unknown as { TuviForm?: unknown; doXem?: unknown };
    return !!w.TuviForm && typeof w.doXem === 'function';
  });
  await page.evaluate((b) => (window as unknown as { TuviForm: { setData(d: object): void } }).TuviForm.setData(b), BIRTH);
  await page.click('#btnGo');
  await page.waitForSelector('#vhPanel', { state: 'visible', timeout: 15000 });
}

test('khách vô danh: bấm mở khoá kích hoạt guest checkout (signInAnonymously)', async ({ page }) => {
  await pinAuth(page, 'anon');
  await stubApis(page, { value: 0 });
  await fillAndRun(page);

  await expect(page.locator('#vhUnlock .tpw-lock')).toBeVisible();
  await page.locator('#vhUnlock .tpw-btn.topup').click();
  await page.waitForFunction(() => (window as unknown as { __signInAnonCalls: number }).__signInAnonCalls >= 1, { timeout: 5000 });
});

test('đã đăng nhập, KHÔNG đủ Lượng: hiện tường thiếu Lượng, KHÔNG trừ tiền', async ({ page }) => {
  await pinAuth(page, 'loggedIn');
  await stubApis(page, { value: 0 });
  await fillAndRun(page);

  await expect(page.locator('#vhUnlock #btnUnlock')).toBeVisible();
  await page.locator('#vhUnlock #btnUnlock').click();
  await expect(page.locator('.tpw-lock-t, .tpw-hd-t')).toContainText(/thiếu|Không đủ/);
  expect(phanCalls(page)).toHaveLength(0);
});

test('đã đăng nhập, ĐỦ Lượng: tự trừ rồi chạy luận vận hạn đầy đủ', async ({ page }) => {
  await pinAuth(page, 'loggedIn');
  await stubApis(page, { value: 300 });
  await fillAndRun(page);

  await page.locator('#vhUnlock #btnUnlock').click();
  await expect(page.locator('#vhProgress')).toBeVisible({ timeout: 10000 });
  await expect.poll(() => phanCalls(page).length, { timeout: 15000 }).toBeGreaterThan(0);
});

// 🔴 Bản vá 2026-09-08 — trước đây trang này KHÔNG lưu/khôi phục gì, nên
// khách nạp Lượng xong quay lại gặp form trống và phải làm lại từ đầu.
test('quay lại sau khi nạp Lượng (?tpwResume=1): tự khôi phục form + tự trừ tiền + tự chạy tiếp', async ({ page }) => {
  await pinAuth(page, 'loggedIn');
  const bal: Balance = { value: 0 };
  await stubApis(page, bal);
  await fillAndRun(page);

  // Bấm mở khoá lúc còn thiếu Lượng — `_insufficient()` (không đổi ở bản vá
  // này) tự ghi `tpw_pending_unlock`; `doXem()` (CÓ đổi) đã tự ghi
  // `vh_pending_resume` NGAY lúc tính khung xong, trước khi biết có thiếu
  // Lượng hay không.
  await page.locator('#vhUnlock #btnUnlock').click();
  await expect(page.locator('.tpw-lock-t, .tpw-hd-t')).toContainText(/thiếu|Không đủ/);
  const pendingRaw = await page.evaluate(() => sessionStorage.getItem('tpw_pending_unlock'));
  expect(pendingRaw).toBeTruthy();
  expect(JSON.parse(pendingRaw as string).product).toBe('van-han-nam');
  const resumeRaw = await page.evaluate(() => sessionStorage.getItem('vh_pending_resume'));
  expect(resumeRaw).toBeTruthy();
  expect(JSON.parse(resumeRaw as string).fd.hoten).toBe(BIRTH.hoten);

  // Mô phỏng đã nạp Lượng thành công ở /topup.html rồi quay lại — sessionStorage
  // sống qua lượt điều hướng này (cùng origin, cùng tab).
  bal.value = 300;
  await page.goto('/app-van-han-nam.html?tpwResume=1');

  // Form tự điền lại — KHÔNG cần gõ tay, KHÔNG cần bấm "Xem vận hạn".
  await expect(page.locator('#vhPanel')).toBeVisible({ timeout: 15000 });
  const restored = await page.evaluate(() => (window as unknown as { TuviForm: { getData(): { hoten: string } } }).TuviForm.getData());
  expect(restored.hoten).toBe(BIRTH.hoten);

  // Mở khoá tự chạy tiếp — KHÔNG cần bấm nút lần hai.
  await expect(page.locator('#vhProgress')).toBeVisible({ timeout: 15000 });
  await expect.poll(() => phanCalls(page).length, { timeout: 15000 }).toBeGreaterThan(0);

  // Ý định resume chỉ dùng MỘT lần — dọn sạch, tải lại lần nữa không tự bấm vô hạn.
  const pendingAfter = await page.evaluate(() => sessionStorage.getItem('tpw_pending_unlock'));
  expect(pendingAfter).toBeNull();
});
