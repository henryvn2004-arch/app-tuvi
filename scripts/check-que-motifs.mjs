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

// Nạp file TS mà KHÔNG cần trình biên dịch: `que-motifs.ts` là một BẢNG DỮ LIỆU
// thuần — đúng một khai báo `export const QUE_MOTIFS: … = { … };` và không có
// dòng logic nào. Nên chỉ cần cắt phần vế phải của dấu `=` rồi cho JS tự đọc.
//
// 🔑 VÌ SAO KHÔNG DÙNG `ts.transpileModule` NHƯ TRƯỚC: gói `typescript@7` là bản
// port native — nó CHỈ còn xuất `version`/`versionMajorMinor`, toàn bộ API biên
// dịch trong JS (`transpileModule`, `ModuleKind`, `ScriptTarget`) đã biến mất.
// Lượt bump 6→7 làm bộ dò này chết ngay lượt chạy đầu và kéo đỏ cả `main`; sửa
// bằng cách bỏ hẳn phụ thuộc thì bump sau không đụng được tới nữa. Việc dịch TS
// thật (file có logic) thì gọi `tsc` CLI — xem `gen-que-images.mjs`.
const src = readFileSync(ROOT + 'lib/media/que-motifs.ts', 'utf8');
const dau = src.match(/export const QUE_MOTIFS\b[^=]*=/);
// Không khớp thì DỪNG HẲN, đừng đọc ra bảng rỗng rồi báo xanh: bộ dò câm nguy
// hiểm hơn bộ dò đỏ (bài học "mọi lượt thay chuỗi bằng script phải assert").
if (!dau) {
  console.error(
    '❌ check-que-motifs: không tìm thấy khai báo `export const QUE_MOTIFS … =` trong\n' +
      '   lib/media/que-motifs.ts. Bố cục file đổi ⇒ PHẢI sửa bộ dò, đừng bỏ qua.'
  );
  process.exit(1);
}
const QUE_MOTIFS = new Function('return ' + src.slice(dau.index + dau[0].length))();

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
