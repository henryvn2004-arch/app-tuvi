// Hard paywall — /app/xem-tuoi (So Tuổi Vợ Chồng, dùng chung file với
// /app/xem-lam-an và /app/tuong-hop).
//
// KHÔNG gọi model thật: mọi API bị `page.route` chặn và trả shape đầy đủ.
// Phần so tuổi (form → điểm/100 → 8 chiều) chạy HOÀN TOÀN client-side
// (TuongHop.calcTuongHop, không gọi server) — chỉ phần "Luận giải chuyên sâu"
// (trả phí) mới chạm `/api/xem-tuoi`.
//
// Bài kiểm cuối cùng đo ĐÚNG bản vá 2026-09-08: trang này là MULTI-PAGE (điều
// hướng CỨNG sang /topup.html rồi quay lại `?tpwResume=1`); trước bản vá,
// khách hết Lượng lúc mở khoá, đi nạp xong quay lại gặp lại HAI form trống,
// phải gõ lại cả hai người rồi bấm mở khoá lần nữa.
//
// Xem tests/hard-paywall.spec.ts để biết vì sao phải ghim `window.Auth` bằng
// `defineProperty writable:false` thay vì xoá storageState.

import { test, expect, type Page } from '@playwright/test';

const COST = 90;
const PERSON_A = { hoten: 'Người A', gioitinh: 'nam', ngay: 15, thang: 6, nam: 1990, gioHour: 9, gioPhut: 0, gioIdx: 5 };
const PERSON_B = { hoten: 'Người B', gioitinh: 'nu', ngay: 3, thang: 3, nam: 1992, gioHour: 14, gioPhut: 0, gioIdx: 8 };

type Balance = { value: number };

async function stubApis(page: Page, bal: Balance) {
  await page.route('**/rest/v1/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route('**/rest/v1/tool_pricing**', (r) => r.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify([{ tool_id: 'xem-tuoi', label: 'Xem tuổi vợ chồng', credits: COST, is_free: false, sort_order: 1 }]) }));
  await page.route('**/rest/v1/credit_packages**', (r) => r.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify([{ package_id: '50', credits: 350, amount_vnd: 199000, label: 'Khởi Đầu' }]) }));
  await page.route('**/api/search', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ docs: '' }) }));
  await page.route('**/api/track**', (r) => r.fulfill({ status: 200, body: '{}' }));
  await page.route('**/api/history**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));

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

  const xemTuoiCalls: number[] = [];
  await page.route('**/api/xem-tuoi**', async (r) => {
    xemTuoiCalls.push(1);
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ luanGiai: 'Chữ AI luận giải.' }) });
  });
  (page as Page & { __xtCalls: number[] }).__xtCalls = xemTuoiCalls;
}
const xtCalls = (page: Page) => (page as Page & { __xtCalls: number[] }).__xtCalls;

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
  await page.goto('/app-xem-tuoi.html');
  await page.waitForFunction(() => {
    const w = window as unknown as { TuviForm?: unknown; doCompat?: unknown };
    return !!w.TuviForm && typeof w.doCompat === 'function';
  });
  await page.evaluate(({ a, b }) => {
    const w = window as unknown as { TuviForm: { setData(d: object, p?: string): void } };
    w.TuviForm.setData(a, 'a');
    w.TuviForm.setData(b, 'b');
  }, { a: PERSON_A, b: PERSON_B });
  await page.click('#btnGo');
  await page.waitForSelector('#xtPanel', { state: 'visible', timeout: 15000 });
}

test('khách vô danh: bấm mở khoá kích hoạt guest checkout (signInAnonymously)', async ({ page }) => {
  await pinAuth(page, 'anon');
  await stubApis(page, { value: 0 });
  await fillAndRun(page);

  await expect(page.locator('#xtUnlock #btnUnlock')).toBeVisible();
  await page.locator('#xtUnlock #btnUnlock').click();
  await page.waitForFunction(() => (window as unknown as { __signInAnonCalls: number }).__signInAnonCalls >= 1, { timeout: 5000 });
});

test('đã đăng nhập, KHÔNG đủ Lượng: hiện tường thiếu Lượng, KHÔNG trừ tiền', async ({ page }) => {
  await pinAuth(page, 'loggedIn');
  await stubApis(page, { value: 0 });
  await fillAndRun(page);

  await page.locator('#xtUnlock #btnUnlock').click();
  await expect(page.locator('.tpw-lock-t, .tpw-hd-t')).toContainText(/thiếu|Không đủ/);
  expect(xtCalls(page)).toHaveLength(0);
});

test('đã đăng nhập, ĐỦ Lượng: tự trừ rồi chạy luận giải chuyên sâu', async ({ page }) => {
  await pinAuth(page, 'loggedIn');
  await stubApis(page, { value: 300 });
  await fillAndRun(page);

  await page.locator('#xtUnlock #btnUnlock').click();
  await expect(page.locator('#xtProgress')).toBeVisible({ timeout: 10000 });
  await expect.poll(() => xtCalls(page).length, { timeout: 15000 }).toBeGreaterThan(0);
});

// 🔴 Bản vá 2026-09-08 — trước đây trang này KHÔNG lưu/khôi phục gì cho cả
// hai form, nên khách nạp Lượng xong quay lại phải gõ lại từ đầu.
test('quay lại sau khi nạp Lượng (?tpwResume=1): tự khôi phục cả hai form + tự trừ tiền + tự chạy tiếp', async ({ page }) => {
  await pinAuth(page, 'loggedIn');
  const bal: Balance = { value: 0 };
  await stubApis(page, bal);
  await fillAndRun(page);

  await page.locator('#xtUnlock #btnUnlock').click();
  await expect(page.locator('.tpw-lock-t, .tpw-hd-t')).toContainText(/thiếu|Không đủ/);
  const pendingRaw = await page.evaluate(() => sessionStorage.getItem('tpw_pending_unlock'));
  expect(pendingRaw).toBeTruthy();
  expect(JSON.parse(pendingRaw as string).product).toBe('xem-tuoi');
  const resumeRaw = await page.evaluate(() => sessionStorage.getItem('xt_pending_resume'));
  expect(resumeRaw).toBeTruthy();
  const savedPair = JSON.parse(resumeRaw as string);
  expect(savedPair.a.hoten).toBe(PERSON_A.hoten);
  expect(savedPair.b.hoten).toBe(PERSON_B.hoten);

  bal.value = 300;
  await page.goto('/app-xem-tuoi.html?tpwResume=1');

  // Cả hai form tự điền lại + tự so tuổi lại — KHÔNG cần gõ tay, KHÔNG cần bấm "So tuổi".
  await expect(page.locator('#xtPanel')).toBeVisible({ timeout: 15000 });
  const restored = await page.evaluate(() => {
    const w = window as unknown as { TuviForm: { getData(p?: string): { hoten: string } } };
    return { a: w.TuviForm.getData('a').hoten, b: w.TuviForm.getData('b').hoten };
  });
  expect(restored.a).toBe(PERSON_A.hoten);
  expect(restored.b).toBe(PERSON_B.hoten);

  // Mở khoá tự chạy tiếp — KHÔNG cần bấm nút lần hai.
  await expect(page.locator('#xtProgress')).toBeVisible({ timeout: 15000 });
  await expect.poll(() => xtCalls(page).length, { timeout: 15000 }).toBeGreaterThan(0);

  const pendingAfter = await page.evaluate(() => sessionStorage.getItem('tpw_pending_unlock'));
  expect(pendingAfter).toBeNull();
});
