// Hard paywall Pha 3 — nhóm tool "một prompt", pilot trên /app/day-con.
//
// Khác Luận Giải ở chỗ bản chất: Luận Giải cắt theo PHẦN (13 phần rời, mỗi phần
// một lượt model, cho không 2 phần đầu). Tool một prompt trả MỘT object JSON có
// schema, nên bản xem trước cắt theo TRƯỜNG (`PREVIEW_KEEP` trong route.ts).
// Bài kiểm này canh đúng chỗ đó: khối bị khoá phải KHÔNG CÓ nội dung trong DOM,
// chứ không phải có mà bị làm mờ — bản trước làm mờ, và view-source đọc hết.
//
// Xem tests/hard-paywall.spec.ts để biết vì sao phải ghim `window.Auth` bằng
// `defineProperty writable:false` thay vì xoá storageState (cookie `_vercel_jwt`
// đi chung file, xoá là mất vé qua cửa Vercel Authentication của preview).

import { test, expect, type Page } from '@playwright/test';

type PreviewCall = { anonId?: string; moiLo?: string };
type PageWithCalls = Page & { __calls: PreviewCall[] };
const calls = (page: Page): PreviewCall[] => (page as PageWithCalls).__calls;

/** Payload XEM TRƯỚC — đúng những khoá `PREVIEW_KEEP` cho qua, không hơn.
 *  Thêm khoá vào đây mà route thật không gửi là tự dựng một bài kiểm đo bản
 *  tưởng tượng; thiếu khoá thì đo nhầm đường lùi. */
const PREVIEW_PAYLOAD = {
  success: true,
  preview: true,
  previewLocked: ['than', 'matDoc', 'changHoc', 'vanNam', 'voiChaMeCoSo', 'truc', 'khieu', 'dinhHuong', 'loLang'],
  ten: 'Bé Kiểm Thử',
  moiLo: { id: 'hoc', label: 'Con không chịu học', can: '' },
  gioiTinh: 'nam',
  tuoi: 9,
  namSinh: 2017,
  kieu: { id: 'k1', ten: 'Kiểu Thẳng', tuTuong: 'nói là làm', motCau: 'một câu về con', dongLuc: 'được công nhận' },
  kieuPhu: null,
  lai: false,
  toaDo: { x: 0.4, y: 0.6 },
  hoc: { dauHieu: ['hay hỏi lại'], tiepThu: '', giaoViec: '', dongVien: '', kyLuatHong: '', hieuNham: '', canHoc: '' },
  conNguoi: 'ĐOẠN VĂN MIỄN PHÍ MỘT về con.',
  chatNoi: 'ĐOẠN VĂN MIỄN PHÍ HAI về chất nổi.',
  khieuTop: { id: 'ngonngu', ten: 'Ngôn ngữ', diem: 7.4, noiBat: true, saoDay: ['Xương Khúc'] },
  coSo: { tong: 84, soSao: 62, soCachCuc: 9, soDaiVan: 13, trichDan: null },
};

/** Bản ĐẦY ĐỦ = bản xem trước + đúng những thứ đang bán. */
const FULL_PAYLOAD = {
  ...PREVIEW_PAYLOAD,
  preview: false,
  truc: [{ id: 't1', ten: 'Thúc hay để yên', diem: 7.2, nghieng: true, cuc: { nhan: 'cần thúc' } }],
  khieu: [
    { id: 'ngonngu', ten: 'Ngôn ngữ', diem: 7.4, noiBat: true, saoDay: ['Xương Khúc'] },
    { id: 'so', ten: 'Con số', diem: 4.1, noiBat: false, saoDay: [] },
  ],
  changHoc: [{ tuoiStart: 6, tuoiEnd: 15, nhan: 'chặng vào nếp', namStart: 2023, namEnd: 2032, diem: 6, dangChay: true }],
  goiYHoatDong: { band: '', list: [], format: '' },
  than: { cung: 'Mệnh' },
  matDoc: [{ nhan: 'Cung Mệnh', cung: 'Tý', muon: false, sao: ['Tử Vi'], cachCuc: [] }],
  dinhHuong: 'CHỮ TRẢ PHÍ định hướng.',
  loLang: 'CHỮ TRẢ PHÍ lo lắng.',
  motCau: 'CHỮ TRẢ PHÍ một câu.',
};

async function stubApis(page: Page, opts?: { previewBody?: object }) {
  const recorded: PreviewCall[] = [];
  (page as PageWithCalls).__calls = recorded;

  // Catch-all ĐỨNG TRƯỚC (page.route đăng ký SAU được ưu tiên).
  await page.route('**/rest/v1/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  // Bảng giá phải có dữ liệu THẬT: đọc hụt thì paywall fail-closed và bỏ dựng
  // tường — assert "tường tồn tại" vẫn xanh vì `#dcLockHost` là div khai sẵn.
  await page.route('**/rest/v1/tool_pricing**', (r) => r.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify([{ tool_id: 'day-con', label: 'Dạy Con Theo Lá Số', credits: 60, is_free: false, sort_order: 1 }]) }));
  await page.route('**/rest/v1/credit_packages**', (r) => r.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify([{ package_id: '50', credits: 350, amount_vnd: 199000, label: 'Khởi Đầu' }]) }));
  await page.route('**/api/payment**', (r) => r.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ hasAccess: false, balance: 0 }) }));
  await page.route('**/api/track**', (r) => r.fulfill({ status: 200, body: '{}' }));

  await page.route('**/api/day-con**', async (r) => {
    const url = new URL(r.request().url());
    if (r.request().method() !== 'POST') {
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, items: [], cached: false, free: false }) });
    }
    const body = JSON.parse(r.request().postData() || '{}');
    const preview = url.searchParams.get('preview') === '1';
    if (preview) recorded.push(body);
    return r.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify(preview ? (opts?.previewBody ?? PREVIEW_PAYLOAD) : FULL_PAYLOAD) });
  });
}

async function run(page: Page) {
  // Ghim CHƯA đăng nhập — `analyze()` rẽ nhánh theo `_dcLoggedIn()`, để mặc
  // định thì bài kiểm đo nhánh đã-đăng-nhập chứ không đo bản xem trước.
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
  // KHÔNG giả cờ webdriver: track.js phải được phép no-op y như với người thật
  // chặn đo — `TuviPaywall.previewAnonId()` không được phụ thuộc vào nó.
  await page.goto('/app-day-con.html');
  await page.waitForFunction(() => {
    const w = window as unknown as { TuviForm?: unknown; analyze?: unknown };
    return !!w.TuviForm && typeof w.analyze === 'function';
  });
  await page.evaluate(() => {
    const w = window as unknown as { TuviForm: { setData(d: Record<string, unknown>, p?: string): void }; analyze(): void };
    w.TuviForm.setData({ hoten: 'Bé Kiểm Thử', gioitinh: 'nam', ngay: 3, thang: 4, nam: 2017, gioHour: 9, gioPhut: 0, gioIdx: 5 });
    w.analyze();
  });
  await page.waitForSelector('#card', { state: 'visible', timeout: 15000 });
}

test('bản xem trước: 2 đoạn văn thật + câu trích, phần bán KHÔNG có trong DOM', async ({ page }) => {
  await stubApis(page);
  await run(page);

  // Mở: hai đoạn model viết + câu trích cổ pháp.
  await expect(page.locator('#conNguoi')).toContainText('ĐOẠN VĂN MIỄN PHÍ MỘT');
  await expect(page.locator('#chatNoiTop')).toContainText('ĐOẠN VĂN MIỄN PHÍ HAI');
  await expect(page.locator('#coSoDoc')).toContainText('84 dữ kiện');
  await expect(page.locator('#basisBlock')).toBeVisible();
  await expect(page.locator('#basisList')).toBeEmpty();     // các dòng cơ sở là phần trả phí

  // Hook hé đúng MỘT chất, đọc từ `khieuTop`.
  await expect(page.locator('#hookHost')).toContainText('Ngôn ngữ');

  // Có mang định danh cho cầu dao — thiếu là mọi khách rơi về khung cũ.
  expect(calls(page)).toHaveLength(1);
  expect(calls(page)[0].anonId).toBeTruthy();

  // 🔴 Điểm chính: nội dung trả phí không có MỘT KÝ TỰ nào trong DOM.
  const html = await page.content();
  expect(html).not.toContain('CHỮ TRẢ PHÍ');
  expect(html).not.toContain('Thúc hay để yên');
  expect(html).not.toContain('chặng vào nếp');
});

test('khối khoá dựng khung rỗng + ô giữ chỗ, không có khối "Hai Bên" khi thiếu lá số cha/mẹ', async ({ page }) => {
  await stubApis(page);
  await run(page);

  // 9 khối khoá (10 trừ `withBlock` — không nhập lá số cha/mẹ).
  await expect(page.locator('#resPanel .tpw-ph-host')).toHaveCount(9);
  await expect(page.locator('#withBlock')).toBeHidden();
  await expect(page.locator('#trucBlock .tpw-ph')).toBeVisible();
  await expect(page.locator('#trucBlock .tpw-lock-badge')).toBeVisible();

  // Con của `.res-block-body` bị giấu HẲN, kể cả mấy dòng ghi chú tĩnh —
  // để lại một câu chú thích lơ lửng trên ô giữ chỗ thì đọc thành lỗi render.
  await expect(page.locator('#trucBlock .fw-note')).toBeHidden();
  await expect(page.locator('#trucBlock .res-block-body')).toHaveClass(/tpw-locked/);

  // Tường phải dựng THẬT (không phải div rỗng khai sẵn) và phải nói GIÁ.
  await expect(page.locator('#dcLockHost .tpw-lock')).toBeVisible();
  await expect(page.locator('#dcLockHost')).toContainText('60 Lượng');
  await expect(page.locator('.tpw-overlay')).toHaveCount(0);
});

test('cầu dao chặn → lùi về khung cũ, không màn hình lỗi', async ({ page }) => {
  // Server chặn thì trả `khung`: có meta, KHÔNG có `conNguoi`/`chatNoi`.
  const khung = { ...PREVIEW_PAYLOAD };
  delete (khung as Record<string, unknown>).conNguoi;
  delete (khung as Record<string, unknown>).chatNoi;
  await stubApis(page, { previewBody: khung });
  await run(page);

  await expect(page.locator('#error-msg')).toBeEmpty();
  await expect(page.locator('#dcName')).toContainText('Bé Kiểm Thử');
  await expect(page.locator('#chatNoiTop')).toBeHidden();
  await expect(page.locator('#dcLockHost .tpw-lock')).toBeVisible();
});

test('trả tiền xong: ô giữ chỗ biến mất, nội dung thật thế chỗ', async ({ page }) => {
  await stubApis(page);
  await run(page);
  await expect(page.locator('#resPanel .tpw-ph-host')).toHaveCount(9);

  // Bỏ qua requireCredits (đường tiền có bài kiểm riêng) — đo chuyện SAU khi
  // trừ tiền: `_doGenerate` phải gỡ sạch dấu vết khoá.
  await page.evaluate(() => (window as unknown as { _doGenerate(f: boolean, lo: string): Promise<void> })._doGenerate(false, 'hoc'));
  await expect(page.locator('#dinhHuong')).toContainText('CHỮ TRẢ PHÍ định hướng', { timeout: 15000 });

  await expect(page.locator('#resPanel .tpw-ph-host')).toHaveCount(0);
  await expect(page.locator('#resPanel .tpw-lock-badge')).toHaveCount(0);
  await expect(page.locator('#resPanel .tpw-locked')).toHaveCount(0);
  await expect(page.locator('#trucBlock .fw-note')).toBeVisible();
});
