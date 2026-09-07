// Hard paywall Pha 3 — tool một-prompt thứ hai, /app/nguoi-khac.
//
// Khác day-con ở hai điểm đáng chú ý:
//   1. `coiTrong` từng đứng CHUNG một khối với hai đoạn miễn phí (`proseTop`)
//      — Pha 3 phải TÁCH nó ra thành khối khoá riêng, không còn vừa hiện vừa
//      che giữa hai đoạn free (đúng điều Henry cấm).
//   2. `keHoachBlock` là khối khoá CÓ ĐIỀU KIỆN theo lựa chọn "việc cần làm"
//      của người dùng (ẩn hẳn khi chọn "hieu-them"), và tiêu đề của nó phải
//      hiện dù nội dung đang khoá.
//
// Xem tests/hard-paywall.spec.ts để biết vì sao phải ghim `window.Auth` bằng
// `defineProperty writable:false` thay vì xoá storageState.

import { test, expect, type Page } from '@playwright/test';

type PreviewCall = { anonId?: string; quanHe?: string; viec?: string };
type PageWithCalls = Page & { __calls: PreviewCall[] };
const calls = (page: Page): PreviewCall[] => (page as PageWithCalls).__calls;

const MAT_DOC_PREVIEW = [
  { cung: 'Mệnh', nhan: 'Cung Mệnh', sao: ['Tử Vi'], muon: false },
  { cung: 'Thiên Di', nhan: 'Cung Thiên Di', sao: ['Thiên Phủ'], muon: false },
];

const PREVIEW_PAYLOAD = {
  success: true,
  preview: true,
  ten: 'Chị Kiểm Thử',
  quanHe: { id: 'sep', label: 'Sếp / cấp trên', cungCuaBan: 'Quan Lộc' },
  viec: { id: 'nho-viec', label: 'Sắp nhờ họ một việc / trình một đề xuất' },
  gioiTinh: 'nu',
  kieu: { id: 'k1', ten: 'Kiểu Quyết Đoán', tuTuong: 'làm trước tính sau', motCau: 'một câu về họ', cauHoi: ['Họ đang nghĩ gì?'] },
  kieuPhu: null,
  lai: false,
  toaDo: { x: 0.3, y: 0.7 },
  matDoc: MAT_DOC_PREVIEW,
  namXem: 2026,
  khoa: [
    { id: 'keHoach', tieuDe: 'Cách đi cho việc: nhờ một việc' },
    { id: 'matDoc', tieuDe: '3 mặt còn lại của người này' },
    { id: 'coiTrong', tieuDe: 'Họ coi trọng cái gì — và sợ mất cái gì' },
    { id: 'nenNoi', tieuDe: 'Ba việc nên nói, kèm câu nói thật để dùng luôn' },
    { id: 'tranhNoi', tieuDe: 'Ba câu tuyệt đối đừng nói với người này' },
    { id: 'thoiDiem', tieuDe: 'Lúc nào nên đưa việc lớn tới' },
    { id: 'motCau', tieuDe: 'Một câu chốt để nhớ về người này' },
  ],
  coSo: { tong: 71, soSao: 58, soCachCuc: 7, soDaiVan: 6, trichDan: null },
  viecChon: [{ id: 'nho-viec', label: 'Sắp nhờ họ một việc / trình một đề xuất' }],
  tinhKhi: 'ĐOẠN VĂN MIỄN PHÍ MỘT về tính khí.',
  chamNoc: 'ĐOẠN VĂN MIỄN PHÍ HAI về điều làm khó chịu.',
};

const FULL_PAYLOAD = {
  ...PREVIEW_PAYLOAD,
  preview: false,
  kieu: { ...PREVIEW_PAYLOAD.kieu, dongLuc: 'x', datChat: 'y', manh: 'z', yeu: 'w', moiTruongHop: 'a', moiTruongKy: 'b' },
  matDoc: [
    ...MAT_DOC_PREVIEW,
    { cung: 'Phúc Đức', nhan: 'Cung Phúc Đức', sao: ['Cự Môn'], muon: false, cachCuc: [] },
    { cung: 'Tật Ách', nhan: 'Cung Tật Ách', sao: ['Thái Âm'], muon: false, cachCuc: [] },
    { cung: 'Tài Bạch', nhan: 'Cung Tài Bạch', sao: ['Vũ Khúc'], muon: false, cachCuc: [] },
  ],
  than: { cung: 'Mệnh' },
  vanNam: { nam: 2026, khung: { tuoiStart: 30, tuoiEnd: 39, diem: 6 } },
  daiVan: { tuoiStart: 30, tuoiEnd: 39, cung: 'Quan Lộc', diem: 6 },
  voiBanCoSo: { cung: 'Huynh Đệ', muon: false, sao: ['Cơ'], cungTinh: true },
  keHoach: 'CHỮ TRẢ PHÍ kế hoạch.',
  coiTrong: 'CHỮ TRẢ PHÍ coi trọng.',
  nenNoi: [{ viec: 'Nói thẳng vấn đề', vidu: 'Em cần anh quyết trong hôm nay' }],
  tranhNoi: [{ viec: 'Vòng vo', vidu: 'Chắc cũng không quan trọng lắm' }],
  thoiDiem: 'CHỮ TRẢ PHÍ thời điểm.',
  voiBan: 'CHỮ TRẢ PHÍ với bạn.',
  motCau: 'CHỮ TRẢ PHÍ một câu.',
};
delete (FULL_PAYLOAD as Record<string, unknown>).khoa;
delete (FULL_PAYLOAD as Record<string, unknown>).coSo;
delete (FULL_PAYLOAD as Record<string, unknown>).viecChon;

async function stubApis(page: Page, opts?: { previewBody?: object }) {
  const recorded: PreviewCall[] = [];
  (page as PageWithCalls).__calls = recorded;

  await page.route('**/rest/v1/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route('**/rest/v1/tool_pricing**', (r) => r.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify([{ tool_id: 'nguoi-khac', label: 'Lá Số Người Khác', credits: 60, is_free: false, sort_order: 1 }]) }));
  await page.route('**/rest/v1/credit_packages**', (r) => r.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify([{ package_id: '50', credits: 350, amount_vnd: 199000, label: 'Khởi Đầu' }]) }));
  await page.route('**/api/payment**', (r) => r.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ hasAccess: false, balance: 0 }) }));
  await page.route('**/api/track**', (r) => r.fulfill({ status: 200, body: '{}' }));

  await page.route('**/api/nguoi-khac**', async (r) => {
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

async function run(page: Page, viec?: string) {
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
  await page.goto('/app-nguoi-khac.html');
  await page.waitForFunction(() => {
    const w = window as unknown as { TuviForm?: unknown; analyze?: unknown };
    return !!w.TuviForm && typeof w.analyze === 'function';
  });
  await page.evaluate((v) => {
    const w = window as unknown as { TuviForm: { setData(d: Record<string, unknown>, p?: string): void }; analyze(): void };
    w.TuviForm.setData({ hoten: 'Chị Kiểm Thử', gioitinh: 'nu', ngay: 8, thang: 3, nam: 1988, gioHour: 14, gioPhut: 0, gioIdx: 7 });
    if (v) (document.getElementById('viecCanLam') as HTMLSelectElement).value = v;
  }, viec);
  await page.evaluate(() => (window as unknown as { analyze(): void }).analyze());
  await page.waitForSelector('#card', { state: 'visible', timeout: 15000 });
}

test('bản xem trước: 2 đoạn văn thật, phần bán KHÔNG có trong DOM', async ({ page }) => {
  await stubApis(page);
  await run(page);

  await expect(page.locator('#tinhKhi')).toContainText('ĐOẠN VĂN MIỄN PHÍ MỘT');
  await expect(page.locator('#chamNoc')).toContainText('ĐOẠN VĂN MIỄN PHÍ HAI');
  await expect(page.locator('#coSoDoc')).toContainText('71 dữ kiện');
  await expect(page.locator('#basisBlock')).toBeVisible();
  await expect(page.locator('#basisList li')).toHaveCount(2); // 2/5 mặt đọc, miễn phí

  expect(calls(page)).toHaveLength(1);
  expect(calls(page)[0].anonId).toBeTruthy();

  const html = await page.content();
  expect(html).not.toContain('CHỮ TRẢ PHÍ');
});

test('khối khoá: keHoach có tiêu đề dù chưa có chữ, coiTrong tách khỏi hai đoạn free', async ({ page }) => {
  await stubApis(page);
  await run(page, 'nho-viec');

  await expect(page.locator('#keHoachBlock')).toBeVisible();
  await expect(page.locator('#keHoachTitle')).toContainText('Sắp nhờ họ một việc');
  await expect(page.locator('#keHoachBlock .tpw-ph')).toBeVisible();
  await expect(page.locator('#keHoachBlock .tpw-lock-badge')).toBeVisible();

  await expect(page.locator('#coiTrongBlock')).toBeVisible();
  await expect(page.locator('#coiTrongBlock .tpw-ph')).toBeVisible();
  // coiTrong không còn nằm giữa hai đoạn free trong `proseTop`.
  await expect(page.locator('#proseTop #coiTrong')).toHaveCount(0);

  await expect(page.locator('#sayBlock .tpw-ph')).toBeVisible();
  await expect(page.locator('#timeBlock .tpw-ph')).toBeVisible();
  await expect(page.locator('#endBlock .tpw-ph')).toBeVisible();
  // Không nhập lá số của người hỏi → withBlock ẩn hẳn, không hứa suông.
  await expect(page.locator('#withBlock')).toBeHidden();

  await expect(page.locator('#nkLockHost .tpw-lock')).toBeVisible();
  await expect(page.locator('#nkLockHost')).toContainText('60 Lượng');
  await expect(page.locator('.tpw-overlay')).toHaveCount(0);
});

test('chọn "chỉ muốn hiểu thêm" → keHoachBlock ẩn hẳn, không phải khối khoá suông', async ({ page }) => {
  await stubApis(page, {
    previewBody: { ...PREVIEW_PAYLOAD, viec: { id: 'hieu-them', label: 'Không có gì gấp, chỉ muốn hiểu người này hơn' } },
  });
  await run(page, 'hieu-them');
  await expect(page.locator('#keHoachBlock')).toBeHidden();
});

test('cầu dao chặn → lùi về khung cũ, không màn hình lỗi', async ({ page }) => {
  const khung = { ...PREVIEW_PAYLOAD };
  delete (khung as Record<string, unknown>).tinhKhi;
  delete (khung as Record<string, unknown>).chamNoc;
  await stubApis(page, { previewBody: khung });
  await run(page);

  await expect(page.locator('#error-msg')).toBeEmpty();
  await expect(page.locator('#nkName')).toContainText('Chị Kiểm Thử');
  await expect(page.locator('#proseTop')).toBeHidden();
  await expect(page.locator('#nkLockHost .tpw-lock')).toBeVisible();
});

test('trả tiền xong: ô giữ chỗ biến mất, nội dung thật thế chỗ', async ({ page }) => {
  await stubApis(page);
  await run(page, 'nho-viec');
  await expect(page.locator('#keHoachBlock .tpw-ph')).toBeVisible();

  await page.evaluate(() => (window as unknown as { _doGenerate(f: boolean, qh: string, viec: string): Promise<void> })
    ._doGenerate(false, 'sep', 'nho-viec'));
  await expect(page.locator('#keHoach')).toContainText('CHỮ TRẢ PHÍ kế hoạch', { timeout: 15000 });

  await expect(page.locator('#resPanel .tpw-ph-host')).toHaveCount(0);
  await expect(page.locator('#resPanel .tpw-lock-badge')).toHaveCount(0);
  await expect(page.locator('#resPanel .tpw-locked')).toHaveCount(0);
  await expect(page.locator('#coiTrong')).toContainText('CHỮ TRẢ PHÍ coi trọng');
  await expect(page.locator('#withBlock')).toBeVisible(); // FULL_PAYLOAD có voiBan + voiBanCoSo
});
