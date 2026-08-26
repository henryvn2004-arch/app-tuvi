#!/usr/bin/env node
// scripts/check-rail-fields.mjs
// ============================================================
// Canh: ENGINE tính ra trường nào thì EXTRACTOR gửi rail phải biết trường đó.
//
// Vì sao cần: engine thêm một trường mới, extractor hand-pick không đụng tới
// → dữ liệu vẫn tính, trang vẫn hiện, rail thì mù. KHÔNG lỗi nào bắn ra, câu
// trả lời chỉ nhạt đi. Đúng họ lỗi luận-giải (mốc section hỏng, bộ cắt câm).
// Đã cắn thật: `extractTuBinhContext` bỏ qua `thapThan` — THẬP THẦN, cột mà
// `app-bat-tu.html` vẽ dưới mỗi trụ — nên hỏi rail "Thất Sát trụ tháng nghĩa
// là gì" là nó luận chay.
//
// Chạy engine vanilla THẬT (không cần tsc) rồi đối chiếu từng khoá cấp 1 với
// mã nguồn extractor. Khoá cố ý bỏ phải khai trong SKIP kèm LÝ DO.
// ============================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
let failed = 0;
const fail = (m) => {
  console.error('  ✗ ' + m);
  failed++;
};

// ── Bát Tự: nạp engine vanilla y như lib/engine/tubinh.ts ────
const g = globalThis;
g.window = g;
const mod = { exports: {} };
new Function(
  'module',
  'exports',
  'window',
  'globalThis',
  readFileSync(join(ROOT, 'public', 'tubinh-ansao-engine.js'), 'utf-8')
)(mod, mod.exports, g, g);
const tinhBatTu = mod.exports.tinhBatTu || g.tinhBatTu;
if (typeof tinhBatTu !== 'function') {
  fail('không nạp được tinhBatTu từ public/tubinh-ansao-engine.js');
  process.exit(1);
}

// Vài lá trải giới tính + giờ để không kết luận từ đúng một ca (trường chỉ
// xuất hiện ở một số lá số — vd thần sát, hình/xung).
const CASES = [
  { ngayDL: 3, thangDL: 6, namDL: 1998, gio: 1, gioitinh: 'nam', namXem: 2026 },
  { ngayDL: 9, thangDL: 5, namDL: 1984, gio: 7, gioitinh: 'nu', namXem: 2026 },
  { ngayDL: 21, thangDL: 11, namDL: 1991, gio: 0, gioitinh: 'nu', namXem: 2026 },
];
const produced = new Set();
for (const c of CASES) {
  const d = tinhBatTu(c);
  for (const [k, v] of Object.entries(d || {})) if (v != null && v !== '') produced.add(k);
}

// ── Khoá CỐ Ý không gửi rail — mỗi cái một lý do ─────────────
const SKIP = {
  input: 'tham số đầu vào, người dùng vừa tự nhập',
  engineVersion: 'siêu dữ liệu kỹ thuật, không phải nội dung luận',
  solarYearAdjusted: 'cờ nội bộ (đã lùi năm trước Lập Xuân) — kết quả đã phản ánh trong tứ trụ',
  canChiNamSinh: 'trùng thông tin trụ Năm đã in trong bảng Tứ Trụ',
  gioChi: 'trùng chi trụ Giờ đã in trong bảng Tứ Trụ',
  tuoiXem: 'đã nêu qua lưu niên + mốc tuổi đại vận',
};

const src = readFileSync(join(ROOT, 'lib', 'agent', 'prompts.ts'), 'utf-8');
const i = src.indexOf('function extractTuBinhContext');
if (i < 0) {
  fail('không tìm thấy extractTuBinhContext trong lib/agent/prompts.ts');
  process.exit(1);
}
let depth = 0,
  end = -1;
for (let k = src.indexOf('{', i); k < src.length; k++) {
  if (src[k] === '{') depth++;
  else if (src[k] === '}') {
    depth--;
    if (depth === 0) {
      end = k;
      break;
    }
  }
}
// CẮT CHÚ THÍCH trước khi quét: chú thích của chính hàm này nhắc tên trường
// (vd "`thapThan` là bảng…") → phép dò thoả mãn nhờ một dòng văn xuôi, trong
// khi mã không hề đọc trường đó. Bộ dò khi ấy XANH oan — nguy hiểm hơn đỏ oan.
const body = src
  .slice(i, end)
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|\s)\/\/[^\n]*/g, '$1');

// Dò theo BIÊN TỪ, không dùng includes thô: `.thapThanCan` chứa `.thapThan`
// nên phép so tiền tố sẽ báo "có đọc" cho một khoá KHÔNG hề được đọc — tức bộ
// dò bỏ lọt đúng con bug nó sinh ra để bắt (red-team lộ ra chuyện này).
const reads = (k) =>
  new RegExp(`[.'"\`]${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w])`).test(body);
const missing = [...produced].filter((k) => !SKIP[k] && !reads(k));
const staleSkip = Object.keys(SKIP).filter((k) => !produced.has(k));

console.log(
  `Bát Tự — engine trả ${produced.size} khoá, extractor bỏ qua có khai ${Object.keys(SKIP).length}.`
);
if (missing.length) {
  fail(
    `extractTuBinhContext KHÔNG đụng tới ${missing.length} khoá engine tính ra: ${missing.join(', ')}\n` +
      '    → gửi vào rail, hoặc khai vào SKIP trong chính bộ dò này kèm LÝ DO.'
  );
} else {
  console.log('  ✓ mọi khoá engine trả ra đều được gửi rail hoặc khai bỏ có lý do');
}
if (staleSkip.length) {
  fail(`SKIP khai thừa (engine không còn trả): ${staleSkip.join(', ')} — gỡ khỏi danh sách`);
}

if (failed) {
  console.error(`\n✗ check:railfields — ${failed} lỗi.`);
  process.exit(1);
}
console.log('\n✓ check:railfields — engine và rail còn khớp trường.');
