import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// W13c — giá trị ĐÃ DỊCH không được làm KHOÁ TRA CỨU.
//
// #1233 từng bọc T() quanh 12 tên cung trong QUERIES của /app/luan-giai; chính chuỗi đó được
// so với `palace.cungName` (tiếng Việt của engine) trong _getTamPhuongStars() ⇒ khi locale có
// bản dịch, tra cứu hụt và câu truy vấn /api/search mất toàn bộ sao tam phương — IM LẶNG.
// Ca kiểm: nhúng một từ điển giả dịch HẾT mọi khoá `js.*` (đúng cơ chế server chèn ở trang
// /<locale>/, lib/i18n/render.mjs), an sao thật bằng engine, rồi so câu truy vấn từng phần với
// bản tiếng Việt: phải GIỐNG HỆT, và phải có sao. Không cần đăng nhập, không gọi mạng nào.

const vi: Record<string, string> = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'i18n', 'vi.json'), 'utf8')
);
const FAKE = Object.fromEntries(
  Object.keys(vi)
    .filter((k) => k.startsWith('js.'))
    .map((k) => [k, `〔${k}〕`])
);

async function queriesFor(page: Page, fakeLocale: boolean) {
  if (fakeLocale) {
    await page.route('**/app/luan-giai', async (route) => {
      const res = await route.fetch();
      let html = await res.text();
      const dict = JSON.stringify({ locale: 'ja', dict: FAKE, alts: {} }).replace(/</g, '\\u003c');
      html = html
        .replace(/<html\b([^>]*)\blang="vi"/i, '<html$1lang="ja"')
        .replace(
          /<head\b[^>]*>/i,
          (m) =>
            `${m}\n<script id="tvmb-i18n" type="application/json">${dict}</script>\n<script src="/tools-shared/i18n.js?v=3"></script>`
        );
      await route.fulfill({ response: res, body: html });
    });
  }
  await page.goto('/app/luan-giai');
  await page.waitForFunction(
    () => typeof (window as any).anSaoLaSo === 'function' && typeof (window as any).QUERIES === 'object'
  );
  return page.evaluate(() => {
    const w = window as any;
    // Lá số cố định — an sao THẬT bằng engine của trang (không mock).
    const conv = w.convertDuongToAm(15, 6, 1990, 8, 'vn');
    w._astrolabe = w.anSaoLaSo({
      ngayAL: conv.amLich.day,
      thangAL: conv.amLich.month,
      namAL: conv.amLich.year,
      canNam: conv.canNam,
      chiNam: conv.chiNam,
      gioIdx: 4,
      gioitinh: 'nam',
      namXem: 2026,
    });
    const out: Record<string, string> = {};
    Object.keys(w.QUERIES).forEach((k) => (out[k] = w.QUERIES[k]()));
    return { locale: w.I18n ? w.I18n.locale : 'vi', out };
  });
}

test('QUERIES của /app/luan-giai không đổi theo ngôn ngữ (sao tam phương vẫn ra)', async ({ browser }) => {
  const viPage = await browser.newPage();
  const base = await queriesFor(viPage, false);
  const jaPage = await browser.newPage();
  const ja = await queriesFor(jaPage, true);

  expect(ja.locale).toBe('ja'); // từ điển giả đã thực sự vào trang
  expect(Object.keys(base.out).length).toBeGreaterThanOrEqual(13);
  // Phần cung (2..13): câu truy vấn phải chứa sao — rỗng = tra cứu hụt.
  for (const k of Object.keys(base.out).filter((x) => +x >= 2)) {
    expect(base.out[k].split(' ').length, `QUERIES[${k}] vi thiếu sao`).toBeGreaterThan(4);
  }
  expect(ja.out).toEqual(base.out);
  for (const v of Object.values(ja.out)) expect(v).not.toContain('〔js.');
});
