// Hard paywall Pha 3 — tool một-prompt thứ ba, /app/huong-nghiep-tre.
//
// Điểm riêng: tool này có một nhánh KHÔNG monetize — lá số đã trưởng thành
// (`laTreEm===false`) bàn giao thẳng sang trang khác, chưa từng gọi model dù
// ở bản xem trước. Bài kiểm phải canh CẢ điều đó vẫn đúng sau Pha 3 (không tự
// dưng bắt đầu gọi model cho một lá số không bao giờ bán được).
//
// Xem tests/hard-paywall.spec.ts để biết vì sao phải ghim `window.Auth` bằng
// `defineProperty writable:false` thay vì xoá storageState.

import { test, expect, type Page } from '@playwright/test';

type PreviewCall = { anonId?: string; moiLo?: string };
type PageWithCalls = Page & { __calls: PreviewCall[] };
const calls = (page: Page): PreviewCall[] => (page as PageWithCalls).__calls;

const HUONG_DAU = {
  id: 'ky-thuat', ten: 'Kỹ thuật', chat: 'thích tháo lắp, tìm hiểu cơ chế',
  dauHieu: ['hay hỏi vì sao'], diem: 7, vi: ['Cự Môn tại Quan Lộc'],
};

const PREVIEW_PAYLOAD = {
  success: true,
  preview: true,
  ten: 'Bé Kiểm Thử',
  namXem: 2026,
  tuoi: 9,
  laTreEm: true,
  namSinh: 2017,
  gioiTinh: 'nam',
  moiLo: { id: 'hoc', label: 'Con không chịu học', can: '' },
  lop: { id: 'nhi', ten: 'Tiểu học', tuoi: '6-11', vaiChaMe: 'đồng hành' },
  kieu: { id: 'k1', ten: 'Kiểu Tò Mò', tuTuong: 'thích hỏi vì sao' },
  kieuPhu: null,
  lai: false,
  toaDo: { x: 0.4, y: 0.5 },
  matDoc: [{ nhan: 'Cung Mệnh', cung: 'Tý', sao: ['Cự Môn'], muon: false, cachCuc: [] }],
  changDangO: { tuoiStart: 6, tuoiEnd: 11, namStart: 2023, namEnd: 2028, cung: 'Tý' },
  chatNguoi: [{ ten: 'Tò mò kỹ thuật', cao: 'thích tháo lắp đồ chơi' }],
  khongDoiHoi: [],
  chuaRoNet: false,
  huongDau: HUONG_DAU,
  conKhoa: ['Nghệ thuật', 'Giao tiếp'],
  nhinRaCon: 'ĐOẠN VĂN MIỄN PHÍ MỘT về con.',
  viSaoHuongNay: 'ĐOẠN VĂN MIỄN PHÍ HAI vì sao nghiêng hướng này.',
};

const FULL_PAYLOAD = {
  ...PREVIEW_PAYLOAD,
  preview: false,
  bayNghe: false,
  huong: [HUONG_DAU, { id: 'nghe-thuat', ten: 'Nghệ thuật', chat: 'thích vẽ', dauHieu: [], diem: 4, vi: [] }],
  batDauTuDau: [{ viec: 'Đăng ký lớp lego cuối tuần', viSao: 'hợp đúng chất tháo lắp' }],
  tranhLam: [{ viec: 'Ép ngồi yên một chỗ quá lâu', viSao: 'làm mất hứng khám phá' }],
  noiTheNao: 'CHỮ TRẢ PHÍ mở lời.',
  loLang: 'CHỮ TRẢ PHÍ lo lắng.',
  mocKeTiep: 'CHỮ TRẢ PHÍ mốc kế tiếp.',
  motCau: 'CHỮ TRẢ PHÍ một câu.',
};

async function stubApis(page: Page, opts?: { previewBody?: object }) {
  const recorded: PreviewCall[] = [];
  (page as PageWithCalls).__calls = recorded;

  await page.route('**/rest/v1/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route('**/rest/v1/tool_pricing**', (r) => r.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify([{ tool_id: 'huong-nghiep-tre', label: 'Hướng Nghiệp Sớm Cho Con', credits: 60, is_free: false, sort_order: 1 }]) }));
  await page.route('**/rest/v1/credit_packages**', (r) => r.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify([{ package_id: '50', credits: 350, amount_vnd: 199000, label: 'Khởi Đầu' }]) }));
  await page.route('**/api/payment**', (r) => r.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ hasAccess: false, balance: 0 }) }));
  await page.route('**/api/track**', (r) => r.fulfill({ status: 200, body: '{}' }));

  await page.route('**/api/huong-nghiep-tre**', async (r) => {
    const url = new URL(r.request().url());
    if (r.request().method() !== 'POST') {
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, items: [] }) });
    }
    const body = JSON.parse(r.request().postData() || '{}');
    const preview = url.searchParams.get('preview') === '1';
    if (preview) recorded.push(body);
    return r.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify(preview ? (opts?.previewBody ?? PREVIEW_PAYLOAD) : FULL_PAYLOAD) });
  });
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
  await page.goto('/app-huong-nghiep-tre.html');
  await page.waitForFunction(() => {
    const w = window as unknown as { TuviForm?: unknown; analyze?: unknown };
    return !!w.TuviForm && typeof w.analyze === 'function';
  });
  await page.evaluate(() => {
    const w = window as unknown as { TuviForm: { setData(d: Record<string, unknown>): void }; analyze(): void };
    w.TuviForm.setData({ hoten: 'Bé Kiểm Thử', gioitinh: 'nam', ngay: 3, thang: 4, nam: 2017, gioHour: 9, gioPhut: 0, gioIdx: 5 });
    w.analyze();
  });
  await page.waitForSelector('#card', { state: 'visible', timeout: 15000 });
}

test('bản xem trước: 2 đoạn văn thật, phần bán KHÔNG có trong DOM', async ({ page }) => {
  await stubApis(page);
  await run(page);

  await expect(page.locator('#nhinRaCon')).toContainText('ĐOẠN VĂN MIỄN PHÍ MỘT');
  await expect(page.locator('#viSaoHuongNay')).toContainText('ĐOẠN VĂN MIỄN PHÍ HAI');
  await expect(page.locator('#huongDauBlock')).toBeVisible(); // miễn phí, dựng rõ
  await expect(page.locator('#chatBlock')).toBeVisible();
  await expect(page.locator('#basisBlock')).toBeVisible();
  await expect(page.locator('#huongDauBlock .tpw-locked')).toHaveCount(0); // không còn làm mờ

  expect(calls(page)).toHaveLength(1);
  expect(calls(page)[0].anonId).toBeTruthy();

  const html = await page.content();
  expect(html).not.toContain('CHỮ TRẢ PHÍ');
});

test('6 khối trả phí dựng ô giữ chỗ, tường có giá', async ({ page }) => {
  await stubApis(page);
  await run(page);

  await expect(page.locator('#resPanel .tpw-ph-host')).toHaveCount(6);
  await expect(page.locator('#loBlock .tpw-ph')).toBeVisible();
  await expect(page.locator('#loBlock .tpw-lock-badge')).toBeVisible();
  await expect(page.locator('#loBlock .res-block-body')).toHaveClass(/tpw-locked/);

  await expect(page.locator('#hnLockHost .tpw-lock')).toBeVisible();
  await expect(page.locator('#hnLockHost')).toContainText('60 Lượng');
  await expect(page.locator('.tpw-overlay')).toHaveCount(0);
});

test('lá số đã trưởng thành: KHÔNG gọi model, bàn giao thẳng — không phải một lượt xem trước hỏng', async ({ page }) => {
  await stubApis(page, { previewBody: { success: true, preview: true, ten: '', namXem: 2026, tuoi: 43, laTreEm: false } });
  await run(page);

  expect(calls(page)).toHaveLength(1); // đúng MỘT lượt xem trước — để biết laTreEm
  await expect(page.locator('#lockBlock')).toBeVisible();
  await expect(page.locator('#lockBlock')).toContainText('không trừ Lượng');
  await expect(page.locator('#nhinRaCon')).toBeHidden();
});

test('cầu dao chặn → lùi về khung cũ, không màn hình lỗi', async ({ page }) => {
  const khung = { ...PREVIEW_PAYLOAD };
  delete (khung as Record<string, unknown>).nhinRaCon;
  delete (khung as Record<string, unknown>).viSaoHuongNay;
  await stubApis(page, { previewBody: khung });
  await run(page);

  await expect(page.locator('#error-msg')).toBeEmpty();
  await expect(page.locator('#heroName')).toContainText('Bé Kiểm Thử');
  await expect(page.locator('#proseTopBlock')).toBeHidden();
  await expect(page.locator('#hnLockHost .tpw-lock')).toBeVisible();
});

test('trả tiền xong: ô giữ chỗ biến mất, nội dung thật thế chỗ', async ({ page }) => {
  await stubApis(page);
  await run(page);
  await expect(page.locator('#resPanel .tpw-ph-host')).toHaveCount(6);

  await page.evaluate(() => (window as unknown as { _doGenerate(f: boolean, lo: string): Promise<void> })._doGenerate(false, 'hoc'));
  await expect(page.locator('#loLang')).toContainText('CHỮ TRẢ PHÍ lo lắng', { timeout: 15000 });

  await expect(page.locator('#resPanel .tpw-ph-host')).toHaveCount(0);
  await expect(page.locator('#resPanel .tpw-lock-badge')).toHaveCount(0);
  await expect(page.locator('#resPanel .tpw-locked')).toHaveCount(0);
});
