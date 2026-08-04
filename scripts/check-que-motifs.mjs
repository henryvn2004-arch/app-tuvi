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
import ts from 'typescript';

const require = createRequire(import.meta.url);
const ROOT = new URL('..', import.meta.url).pathname;

const { QUE } = require(ROOT + 'public/tools-shared/kinh-dich.js');

// Nạp file TS bằng cách biên dịch tại chỗ — cùng cách `gen-que-images.mjs` làm,
// để script canh đọc CHÍNH file mà route dùng chứ không phải một bản chép.
const src = readFileSync(ROOT + 'lib/media/que-motifs.ts', 'utf8');
const js = ts.transpileModule(src, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const mod = { exports: {} };
new Function('module', 'exports', js)(mod, mod.exports);
const { QUE_MOTIFS } = mod.exports;

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
