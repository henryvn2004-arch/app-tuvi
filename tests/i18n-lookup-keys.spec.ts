import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// W13c — giá trị ĐÃ DỊCH không được làm KHOÁ TRA CỨU hay DỮ LIỆU GỬI SERVER.
//
// #1233 từng bọc T() quanh 12 tên cung trong QUERIES của /app/luan-giai; chính chuỗi đó được so với
// `palace.cungName` (tiếng Việt của engine) trong _getTamPhuongStars() ⇒ khi locale có bản dịch, tra cứu
// hụt và câu truy vấn /api/search mất toàn bộ sao tam phương — IM LẶNG. Cùng lượt đó văn bản tứ trụ /
// truy vấn RAG gửi /api/tubinh của /app/bat-tu cũng bị dịch.
// Ca kiểm: nhúng một từ điển giả dịch HẾT mọi khoá `js.*` (đúng cơ chế server chèn ở trang /<locale>/,
// lib/i18n/render.mjs), chạy engine THẬT, rồi so dữ liệu gửi đi với bản tiếng Việt: phải GIỐNG HỆT và
// không chứa dấu của từ điển giả. Không cần đăng nhập, không gọi mạng nào.

const I18N = path.join(__dirname, '..', 'i18n');
const vi: Record<string, string> = JSON.parse(fs.readFileSync(path.join(I18N, 'vi.json'), 'utf8'));
const FAKE = Object.fromEntries(
  Object.keys(vi)
    .filter((k) => k.startsWith('js.'))
    .map((k) => [k, `〔${k}〕`])
);
const MARK = '〔js.';

async function open(page: Page, url: string, fakeLocale: boolean) {
  if (fakeLocale) {
    await page.route('**' + url, async (route) => {
      const res = await route.fetch();
      const dict = JSON.stringify({ locale: 'ja', dict: FAKE, alts: {} }).replace(/</g, '\\u003c');
      const html = (await res.text())
        .replace(/<html\b([^>]*)\blang="vi"/i, '<html$1lang="ja"')
        .replace(
          /<head\b[^>]*>/i,
          (m) =>
            `${m}\n<script id="tvmb-i18n" type="application/json">${dict}</script>\n<script src="/tools-shared/i18n.js?v=3"></script>`
        );
      await route.fulfill({ response: res, body: html });
    });
  }
  await page.goto(url);
}

async function luanGiaiQueries(page: Page, fake: boolean) {
  await open(page, '/app/luan-giai', fake);
  await page.waitForFunction(() => typeof (window as any).anSaoLaSo === 'function' && typeof (window as any).QUERIES === 'object');
  return page.evaluate(() => {
    const w = window as any;
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

async function batTuPayloads(page: Page, fake: boolean) {
  await open(page, '/app/bat-tu', fake);
  await page.waitForFunction(() => typeof (window as any).tinhBatTu === 'function' && typeof (window as any).formatBatTuToText === 'function');
  return page.evaluate(() => {
    const w = window as any;
    const bt = w.tinhBatTu({ ngayDL: 15, thangDL: 6, namDL: 1990, gio: 8, gioitinh: 'nam', namXem: 2026, lich: 'vn', gioLich: 8, phutLich: 0 });
    w._batTu = bt;
    const out: Record<string, string> = { batTuText: w.formatBatTuToText(bt) };
    for (const g of ['overview', 'thapthan', 'tinhduyen', 'suckhoe', 'hopxung', 'daivan', 'x'])
      out['query:' + g] = w.buildGroupQuery(g, bt);
    for (let p = 1; p <= 12; p++) out['pregen:' + p] = String(w.buildPregenContextForPhan(p, bt) || '');
    return { locale: w.I18n ? w.I18n.locale : 'vi', out };
  });
}

test('QUERIES của /app/luan-giai không đổi theo ngôn ngữ (sao tam phương vẫn ra)', async ({ browser }) => {
  const base = await luanGiaiQueries(await browser.newPage(), false);
  const ja = await luanGiaiQueries(await browser.newPage(), true);
  expect(ja.locale).toBe('ja'); // từ điển giả đã thực sự vào trang
  expect(Object.keys(base.out).length).toBeGreaterThanOrEqual(13);
  // Phần cung (2..13): câu truy vấn phải chứa sao — rỗng = tra cứu hụt.
  for (const k of Object.keys(base.out).filter((x) => +x >= 2))
    expect(base.out[k].split(' ').length, `QUERIES[${k}] vi thiếu sao`).toBeGreaterThan(4);
  expect(ja.out).toEqual(base.out);
  for (const v of Object.values(ja.out)) expect(v).not.toContain(MARK);
});

test('/app/bat-tu: văn bản tứ trụ, truy vấn RAG và ngữ cảnh gửi /api/tubinh không đổi theo ngôn ngữ', async ({ browser }) => {
  const base = await batTuPayloads(await browser.newPage(), false);
  const ja = await batTuPayloads(await browser.newPage(), true);
  expect(ja.locale).toBe('ja');
  expect(base.out.batTuText.length).toBeGreaterThan(200);
  expect(ja.out).toEqual(base.out);
  for (const v of Object.values(ja.out)) expect(v).not.toContain(MARK);
});

test('bản dịch giữ khoảng trắng đầu/cuối của câu gốc (mảnh ghép không dính chữ)', () => {
  const edge = (s: string) => [/^\s*/.exec(s)![0], /\s*$/.exec(s)![0]].join('|');
  // Ngoại lệ khớp lib/i18n/core.mjs (padEdges): bản dịch bắt đầu/kết thúc bằng dấu câu toàn khổ CJK thì phía đó
  // không đệm dấu cách/tab (dạng cũ đệm đủ vẫn được chấp nhận). Xuống dòng ở biên vẫn phải giữ.
  const CJK = /[\u3001-\u303F\u2026\uFF01-\uFF0F\uFF1A-\uFF20\uFF3B-\uFF40\uFF5B-\uFF65]/;
  const h = (e: string) => e.replace(/[ \t\u00a0]+/g, '');
  const ok = (v: string, t: string) => {
    const [a, b] = [/^\s*/.exec(v)![0], /\s*$/.exec(v)![0]];
    const c = t.trim();
    const want = [CJK.test(c[0]) ? h(a) : a, CJK.test(c[c.length - 1]) ? h(b) : b].join('|');
    return edge(t) === edge(v) || edge(t) === want;
  };
  for (const l of ['en', 'ja', 'ko', 'zh-tw', 'zh-cn']) {
    const d: Record<string, { t: string }> = JSON.parse(fs.readFileSync(path.join(I18N, `${l}.json`), 'utf8'));
    const bad = Object.keys(d).filter((k) => k in vi && !ok(vi[k], d[k].t));
    expect(bad, `${l}: khoảng trắng biên lệch`).toEqual([]);
  }
});
