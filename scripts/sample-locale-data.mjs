#!/usr/bin/env node
/**
 * Số liệu ENGINE THẬT cho văn mẫu theo ngôn ngữ (W32A-3) — KHÔNG gõ tay con số nào trong văn mẫu.
 *
 * Mở trang thật trên server cục bộ, lập lá số của nhân vật hư cấu (scripts/fixtures/sample-personas.json) bằng ĐÚNG đường
 * trang dùng khi khách bấm nút (`convertDuongToAm(…, lich)` → `anSaoLaSo` → `formatLaSoV2`), và gọi route thật
 * `/api/van-han-nam?action=khung` cho khung 12 tháng âm. In ra lá-số-text + khung để người viết văn mẫu đọc.
 *
 *   npx next dev -p 3100   (hoặc next start)
 *   node scripts/sample-locale-data.mjs <locale> [port] > /tmp/x.txt
 *
 * Playwright dùng Chromium cài sẵn (`PW_CHROMIUM`, mặc định /opt/pw-browsers/chromium).
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const [loc, port = '3100'] = process.argv.slice(2);
const P = JSON.parse(readFileSync(new URL('./fixtures/sample-personas.json', import.meta.url), 'utf8'));
const p = P[loc];
if (!p) {
  console.error('locale không có trong sample-personas.json: ' + loc);
  process.exit(1);
}
const b = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium',
  args: ['--no-sandbox'],
});
const page = await b.newPage();
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
await page.goto(`http://127.0.0.1:${port}/app/luan-giai`, { waitUntil: 'domcontentloaded', timeout: 240000 });
await page.waitForFunction(() => typeof window.anSaoLaSo === 'function' && typeof window.formatLaSoV2 === 'function', null, {
  timeout: 60000,
});
const out = await page.evaluate(
  async ({ p, namXem, kt }) => {
    const conv = window.convertDuongToAm(p.ngay, p.thang, p.nam, p.gio, p.lich);
    conv.gioIdx = p.gioIdx;
    const ls = window.anSaoLaSo({
      ngayAL: conv.amLich.day, thangAL: conv.amLich.month, namAL: conv.amLich.year,
      canNam: conv.canNam, chiNam: conv.chiNam, gioIdx: p.gioIdx, gioitinh: p.gioitinh, namXem,
    });
    const text = window.formatLaSoV2(ls, conv);
    const birth = { day: p.ngay, month: p.thang, year: p.nam, hourBranch: p.gioIdx, hour: p.gio, minute: p.phut, gender: p.gioitinh, lich: p.lich };
    const r = await fetch('/api/van-han-nam?action=khung', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ birth, tuNgay: kt.ngay, tuThang: kt.thang, tuNam: kt.nam }),
    });
    const k = await r.json();
    const dv = (ls.daiVans || []).slice(0, 9).map((d, i) => ({ i: i + 1, tuoi: d.tuoiStart + '-' + d.tuoiEnd, chi: d.diaChi, cung: (ls.palaces[d.cungIdx] || {}).cungName, diem: d.scoring && d.scoring.tong }));
    const SAO = ['Văn Xương','Văn Khúc','Thiên Khôi','Thiên Việt','Tả Phù','Hữu Bật','Lộc Tồn','Thiên Mã','Kình Dương','Đà La','Hỏa Tinh','Linh Tinh','Địa Không','Địa Kiếp','Tuần','Triệt','Hóa Lộc','Hóa Quyền','Hóa Khoa','Hóa Kỵ','Đào Hoa','Hồng Loan','Thiên Hình','Thiên Riêu','Bạch Hổ','Tang Môn'];
    const cung = (ls.palaces || []).map((x) => {
      const sc = ls.cungScores && ls.cungScores[x.cungName];
      return x.cungName + '(' + x.diaChi + (sc ? ' ' + sc.tong : '') + '): ' +
        ((x.majorStars || []).map((s) => s.ten + '[' + (s.brightness || '') + ']' + (s.hoa ? 'Hóa' + s.hoa : '')).join(' ') || 'VCD') +
        ' | ' + (x.stars || []).map((s) => s.ten).filter((t) => SAO.includes(t)).join(',');
    });
    const cc = (ls.cachCuc || []).map((c) => c.ten + (c.cung ? '@' + c.cung : ''));
    return { cung, cc, amLich: conv.amLich, canChiNam: conv.canNam + ' ' + conv.chiNam, cuc: ls.cuc, dv, hienTai: ls.daiVanHienTai && ls.daiVanHienTai.tuoiStart, text, khung: k.khung, labels: k.labels };
  },
  { p, namXem: P.namXem, kt: P.khungTu }
);
if (process.argv.includes('--gon')) {
  console.log(JSON.stringify(p));
  console.log('ÂL', JSON.stringify(out.amLich), out.canChiNam, out.cuc, '| ĐV hiện tại từ tuổi', out.hienTai);
  console.log('ĐV: ' + out.dv.map((d) => d.i + ':' + d.tuoi + ' ' + d.chi + '/' + d.cung + ' ' + d.diem).join(' · '));
  console.log('CUNG:\n  ' + out.cung.join('\n  '));
  console.log('CÁCH CỤC: ' + out.cc.join(' · '));
  console.log('KHUNG:');
  for (const t of (out.khung && out.khung.thangs) || [])
    console.log('  ' + [t.nhanDay, 'NH ' + t.cungNguyetHan, 'TH ' + t.cungTieuHan, t.chinhTinh.join(','), 'cát ' + t.catTinh.join(','), 'sát ' + t.satTinh.join(','), t.toHop.map((h) => h.ten).slice(0, 2).join('/')].join(' | '));
  await b.close();
  process.exit(0);
}
console.log(JSON.stringify({ persona: p, amLich: out.amLich, canChiNam: out.canChiNam, cuc: out.cuc, daiVan: out.dv, dvHienTaiTuoi: out.hienTai, labels: out.labels }, null, 1));
console.log('\n=== KHUNG 12 THÁNG ===');
for (const t of (out.khung && out.khung.thangs) || [])
  console.log([t.nhanDay, 'nguyệt hạn ' + t.cungNguyetHan, 'tiểu hạn ' + t.cungTieuHan, 'chính: ' + t.chinhTinh.join(','), 'cát: ' + t.catTinh.join(','), 'sát: ' + t.satTinh.join(','), 'bại: ' + t.baiTinh.join(','), 'tổ hợp: ' + t.toHop.map((h) => h.ten).join(' / ')].join(' | '));
console.log('\n' + out.text);
await b.close();
