#!/usr/bin/env node
/**
 * Canh bảng lời quẻ + 384 hào từ (`public/tools-shared/kinh-dich-hao.js`).
 *
 * Vì sao cần: bảng này dài 64 mục × 14 chuỗi. Thiếu một hào, lệch một thứ tự,
 * hay quên bản Việt thì người dùng gieo đúng vào quẻ đó sẽ nhận một ô TRỐNG —
 * mà 64 quẻ thì không ai soi tay hết được. Cùng lý do với
 * `check-hexagram-table.mjs`: loại lỗi này phải chốt bằng máy.
 *
 * Bảng đang dịch DẦN nên script báo ĐỘ PHỦ và chỉ fail khi:
 *   - mục đã có mà thiếu trường / sai số lượng hào
 *   - thứ tự lệch khỏi `QUE` trong `kinh-dich.js`
 *   - Càn/Khôn thiếu Dụng Cửu / Dụng Lục (chỉ hai quẻ này mới cần)
 *   - bản Việt trùng y hệt Hán văn (dấu hiệu quên dịch)
 * Đủ 64 mục thì thêm điều kiện: phải đủ 64, không thiếu quẻ nào.
 *
 * Chạy: node scripts/check-hao-data.mjs
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const ROOT = new URL('..', import.meta.url).pathname;

const { HAO, layLoi } = require(ROOT + 'public/tools-shared/kinh-dich-hao.js');
const { QUE } = require(ROOT + 'public/tools-shared/kinh-dich.js');
const { chonLoiDoc } = require(ROOT + 'public/tools-shared/kinh-dich-doc.js');

let bad = 0;
const fail = (m) => {
  console.error('❌ ' + m);
  bad++;
};

HAO.forEach((d, i) => {
  const ten = QUE[i] ? QUE[i].n : '???';
  const nhan = `#${i + 1} ${ten}`;
  if (!d.q) fail(`${nhan}: thiếu lời quẻ Hán văn`);
  if (!d.qv) fail(`${nhan}: thiếu lời quẻ bản Việt`);
  if (d.q && d.qv && d.q === d.qv) fail(`${nhan}: bản Việt trùng y hệt Hán văn — quên dịch?`);
  if (!Array.isArray(d.h) || d.h.length !== 6)
    fail(`${nhan}: phải có đúng 6 hào từ Hán văn, đang có ${d.h?.length ?? 0}`);
  if (!Array.isArray(d.hv) || d.hv.length !== 6)
    fail(`${nhan}: phải có đúng 6 hào từ bản Việt, đang có ${d.hv?.length ?? 0}`);
  (d.hv || []).forEach((v, j) => {
    if (!v || !v.trim()) fail(`${nhan}: hào ${j + 1} thiếu bản Việt`);
    else if (v === d.h[j]) fail(`${nhan}: hào ${j + 1} bản Việt trùng Hán văn — quên dịch?`);
  });
  // Chỉ thuần Càn (111111) và thuần Khôn (000000) mới có Dụng Cửu / Dụng Lục.
  const thuan = QUE[i] && (QUE[i].li === '111111' || QUE[i].li === '000000');
  if (thuan && !d.dung)
    fail(`${nhan}: quẻ thuần, thiếu Dụng Cửu/Dụng Lục (cần khi cả 6 hào đều động)`);
  if (!thuan && d.dung) fail(`${nhan}: không phải quẻ thuần mà lại có "dung"`);
});

// Đầu-cuối: mọi mục mà luật đọc chỉ ra đều phải LẤY RA ĐƯỢC chữ.
const mk = (li, dong) =>
  li.split('').map((c, i) => ({ yang: c === '1', changing: dong.includes(i + 1) }));
let thieuChu = 0;
for (let k = 1; k <= HAO.length; k++) {
  const li = QUE[k - 1].li;
  for (let d = 0; d < 64; d++) {
    const dong = [];
    for (let i = 0; i < 6; i++) if (d & (1 << i)) dong.push(i + 1);
    const r = chonLoiDoc(mk(li, dong));
    for (const muc of r.doc) {
      // Mục ở quẻ BIẾN có thể trỏ sang quẻ chưa dịch — bỏ qua ở giai đoạn này.
      if (muc.nguon === 'bien') continue;
      const loi = layLoi(k, muc);
      if (!loi || !loi.viet) {
        thieuChu++;
        if (thieuChu <= 3)
          fail(
            `#${k} ${QUE[k - 1].n}: ${r.luat} → không lấy được chữ cho ${muc.loai} ${muc.hao ?? ''}`
          );
      }
    }
  }
}
if (thieuChu > 3) fail(`… và ${thieuChu - 3} ca nữa không lấy được chữ`);

const daCo = HAO.length;
if (daCo === 64 && bad === 0) {
  console.log(
    '✅ Đủ 64 quẻ · 384 hào từ · lời quẻ và bản Việt đầy đủ · luật đọc lấy được chữ ở mọi ca.'
  );
} else if (bad === 0) {
  console.log(
    `🟡 Đang dịch dần: ${daCo}/64 quẻ (${daCo * 6}/384 hào). Phần đã có hợp lệ, luật đọc lấy được chữ.`
  );
} else {
  console.error(`\n${bad} lỗi trong bảng hào từ — người gieo trúng quẻ đó sẽ thấy ô trống.`);
  process.exitCode = 1;
}
