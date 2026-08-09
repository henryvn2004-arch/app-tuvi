#!/usr/bin/env node
/**
 * Canh bảng mô-típ tranh 64 quẻ (`lib/media/que-motifs.ts`).
 *
 * Vì sao cần: bộ tranh vẽ MỘT LẦN rồi dùng mãi, mỗi bức ~4.000đ. Một quẻ thiếu
 * mô-típ thì prompt rơi về nhánh "phong cảnh trống không người" — bức đó vẫn
 * vẽ ra, vẫn tốn tiền, vẫn trông đẹp, mà KHÔNG khớp hào nào cả. Loại lỗi này
 * không lộ ra lúc chạy, chỉ lộ khi có người ngồi đối chiếu 64 bức với 384 hào
 * từ — nên phải chốt bằng máy TRƯỚC khi đốt tiền.
 *
 * Fail khi:
 *   - thiếu quẻ, hoặc không đúng 6 mô-típ
 *   - mô-típ rỗng / quá ngắn (không đủ thành một cảnh vẽ được)
 *   - hai mô-típ trùng nhau trong CÙNG một quẻ → model vẽ hai dải giống hệt,
 *     đúng cái lỗi "bỏ bớt mô-típ" đã phải vá bằng sáu dải chiều cao
 *   - nhắc tới chữ viết / con dấu / khung tranh — ba thứ đó prompt lo riêng,
 *     nhắc lại ở mô-típ là model vẽ thêm một con dấu thứ hai
 *
 * Chạy: node scripts/check-que-motifs.mjs
 */
import { readFileSync } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ROOT = new URL('..', import.meta.url).pathname;

const { QUE } = require(ROOT + 'public/tools-shared/kinh-dich.js');

// Nạp file TS mà KHÔNG dùng compiler API của `typescript`.
//
// Vì sao: bản cũ gọi `ts.transpileModule` và chết trên CI với
// "Cannot read properties of undefined (reading 'CommonJS')" — trên Node 20
// (bản CI ghim) `typescript` 6.x trả về một object THIẾU `ModuleKind`, còn
// Node 22 (máy dev) thì đủ. Đổi `import ts` → `require('typescript')` KHÔNG
// cứu được: lượt CI sau vẫn đỏ y hệt. Đây là kiểu lỗi chỉ hiện ở CI, chạy
// local mãi không tái hiện — và nó chặn MỌI PR trong repo.
//
// `que-motifs.ts` là DATA THUẦN: đúng một `export const`, không import, không
// hàm, không `as const`. Nên bỏ hẳn compiler đi, chỉ đổi khai báo export thành
// gán CJS. Rẻ hơn và không còn phụ thuộc cách đóng gói của TypeScript.
// ⚠️ Phép thay phải ASSERT là đã ăn — thay hụt mà im lặng thì bộ dò tự tắt.
const src = readFileSync(ROOT + 'lib/media/que-motifs.ts', 'utf8');
const DECL = /export\s+const\s+QUE_MOTIFS\s*:\s*Record<number,\s*string\[\]>\s*=/;
if (!DECL.test(src)) {
  console.error(
    '✗ check-que-motifs: không tìm thấy khai báo `export const QUE_MOTIFS: Record<number, string[]> =`\n' +
      '  trong lib/media/que-motifs.ts. File đổi cấu trúc → sửa lại phép nạp ở đây.'
  );
  process.exit(1);
}
const mod = { exports: {} };
new Function('module', 'exports', src.replace(DECL, 'module.exports.QUE_MOTIFS ='))(
  mod,
  mod.exports
);
const { QUE_MOTIFS } = mod.exports;
if (!QUE_MOTIFS || typeof QUE_MOTIFS !== 'object') {
  console.error('✗ check-que-motifs: nạp được file nhưng QUE_MOTIFS rỗng — phép nạp hỏng.');
  process.exit(1);
}

let bad = 0;
const fail = (m) => {
  console.error('❌ ' + m);
  bad++;
};

/** Ba thứ prompt đã lo riêng — mô-típ nhắc lại là vẽ chồng lên nhau. */
const CAM = /\b(seal|stamp|calligraph|inscription|signature|scroll border|red square)\b/i;

for (let kw = 1; kw <= 64; kw++) {
  const ten = QUE[kw - 1].n;
  const nhan = `#${kw} ${ten}`;
  const m = QUE_MOTIFS[kw];
  if (!m) {
    fail(`${nhan}: thiếu hẳn — bức này sẽ vẽ ra phong cảnh trống, không khớp hào nào`);
    continue;
  }
  if (!Array.isArray(m) || m.length !== 6) {
    fail(`${nhan}: phải đúng 6 mô-típ (hào 1→6), đang có ${m.length}`);
    continue;
  }
  const thay = new Set();
  m.forEach((s, i) => {
    const h = `hào ${i + 1}`;
    if (typeof s !== 'string' || s.trim().length < 20)
      fail(`${nhan} ${h}: quá ngắn, không thành một cảnh vẽ được — "${s}"`);
    if (CAM.test(s)) fail(`${nhan} ${h}: nhắc tới chữ/triện/khung — prompt đã lo, bỏ đi`);
    const key = s.trim().toLowerCase();
    if (thay.has(key)) fail(`${nhan} ${h}: trùng y hệt một mô-típ khác trong cùng quẻ`);
    thay.add(key);
  });
}

const co = Object.keys(QUE_MOTIFS).length;
if (bad === 0) {
  console.log(`✅ Đủ ${co}/64 quẻ · ${co * 6} mô-típ · không dòng nào trùng hay lấn phần prompt.`);
} else {
  console.error(`\n${bad} lỗi trong bảng mô-típ — sửa trước khi chạy lượt vẽ.`);
  process.exitCode = 1;
}
