#!/usr/bin/env node
/**
 * Chặn tái phát: bảng 64 quẻ trong `public/tools-shared/kinh-dich.js` sai mã hào.
 *
 * Bệnh đã xảy ra thật: 49/64 quẻ mang mã hào của quẻ KHÁC — 47 ca do chuỗi `li`
 * bị viết NGƯỢC (trên→dưới thay vì dưới→trên như comment khai), 2 ca gõ nhầm.
 * Hệ quả: 77% số kiểu gieo trả về sai tên quẻ và sai lời đoán — gieo ra Bác
 * (sụp đổ) thì tool đọc thành Phục (phục hồi), lời khuyên ngược hẳn.
 *
 * Vì sao chạy cả năm không ai thấy: `findHexagram` có nhánh "tìm quẻ gần nhất"
 * nên mã không tồn tại KHÔNG ném lỗi, nó lặng lẽ trả về một quẻ khác. Mắt
 * thường cũng không soi được 64 chuỗi nhị phân. Loại lỗi này phải chốt bằng máy.
 *
 * Cách kiểm: dựng lại bảng chuẩn ĐỘC LẬP từ cặp bát quái (thượng/hạ) theo thứ
 * tự King Wen rồi đối chiếu — cố ý KHÔNG chép mã từ chính file đang kiểm, vì
 * chép thì bài kiểm chỉ xác nhận file bằng chính nó.
 *
 * Chạy: node scripts/check-hexagram-table.mjs
 */
import { readFileSync } from 'fs';

const FILE = 'public/tools-shared/kinh-dich.js';
const ROOT = new URL('..', import.meta.url).pathname;

// Bát quái, đọc từ hào DƯỚI lên hào TRÊN, 1 = dương (⚊), 0 = âm (⚋).
const QUAI = {
  càn: '111',
  đoài: '110',
  ly: '101',
  chấn: '100',
  tốn: '011',
  khảm: '010',
  cấn: '001',
  khôn: '000',
};

// 64 quẻ theo thứ tự King Wen: [tên, quái THƯỢNG, quái HẠ].
const KING_WEN = [
  ['Càn', 'càn', 'càn'],
  ['Khôn', 'khôn', 'khôn'],
  ['Truân', 'khảm', 'chấn'],
  ['Mông', 'cấn', 'khảm'],
  ['Nhu', 'khảm', 'càn'],
  ['Tụng', 'càn', 'khảm'],
  ['Sư', 'khôn', 'khảm'],
  ['Tỉ', 'khảm', 'khôn'],
  ['Tiểu Súc', 'tốn', 'càn'],
  ['Lý', 'càn', 'đoài'],
  ['Thái', 'khôn', 'càn'],
  ['Bĩ', 'càn', 'khôn'],
  ['Đồng Nhân', 'càn', 'ly'],
  ['Đại Hữu', 'ly', 'càn'],
  ['Khiêm', 'khôn', 'cấn'],
  ['Dự', 'chấn', 'khôn'],
  ['Tùy', 'đoài', 'chấn'],
  ['Cổ', 'cấn', 'tốn'],
  ['Lâm', 'khôn', 'đoài'],
  ['Quán', 'tốn', 'khôn'],
  ['Phệ Hạp', 'ly', 'chấn'],
  ['Bí', 'cấn', 'ly'],
  ['Bác', 'cấn', 'khôn'],
  ['Phục', 'khôn', 'chấn'],
  ['Vô Vọng', 'càn', 'chấn'],
  ['Đại Súc', 'cấn', 'càn'],
  ['Di', 'cấn', 'chấn'],
  ['Đại Quá', 'đoài', 'tốn'],
  ['Khảm', 'khảm', 'khảm'],
  ['Ly', 'ly', 'ly'],
  ['Hàm', 'đoài', 'cấn'],
  ['Hằng', 'chấn', 'tốn'],
  ['Độn', 'càn', 'cấn'],
  ['Đại Tráng', 'chấn', 'càn'],
  ['Tấn', 'ly', 'khôn'],
  ['Minh Di', 'khôn', 'ly'],
  ['Gia Nhân', 'tốn', 'ly'],
  ['Khuê', 'ly', 'đoài'],
  ['Kiển', 'khảm', 'cấn'],
  ['Giải', 'chấn', 'khảm'],
  ['Tổn', 'cấn', 'đoài'],
  ['Ích', 'tốn', 'chấn'],
  ['Quải', 'đoài', 'càn'],
  ['Cấu', 'càn', 'tốn'],
  ['Tụy', 'đoài', 'khôn'],
  ['Thăng', 'khôn', 'tốn'],
  ['Khốn', 'đoài', 'khảm'],
  ['Tỉnh', 'khảm', 'tốn'],
  ['Cách', 'đoài', 'ly'],
  ['Đỉnh', 'ly', 'tốn'],
  ['Chấn', 'chấn', 'chấn'],
  ['Cấn', 'cấn', 'cấn'],
  ['Tiệm', 'tốn', 'cấn'],
  ['Quy Muội', 'chấn', 'đoài'],
  ['Phong', 'chấn', 'ly'],
  ['Lữ', 'ly', 'cấn'],
  ['Tốn', 'tốn', 'tốn'],
  ['Đoài', 'đoài', 'đoài'],
  ['Hoán', 'tốn', 'khảm'],
  ['Tiết', 'khảm', 'đoài'],
  ['Trung Phu', 'tốn', 'đoài'],
  ['Tiểu Quá', 'chấn', 'cấn'],
  ['Ký Tế', 'khảm', 'ly'],
  ['Vị Tế', 'ly', 'khảm'],
];

// `li` khai từ hào 1 (dưới) → hào 6 (trên) ⇒ quái HẠ trước, quái THƯỢNG sau.
const canon = KING_WEN.map(([name, upper, lower]) => ({ name, li: QUAI[lower] + QUAI[upper] }));

const fail = (msg) => {
  console.error('❌ ' + msg);
  process.exitCode = 1;
};

// Bảng chuẩn phải tự đứng vững trước đã: 64 mã phân biệt = phủ đủ 2^6 tổ hợp.
// Gõ nhầm một cặp quái trong KING_WEN ở trên sẽ lộ ngay tại đây.
if (new Set(canon.map((c) => c.li)).size !== 64) {
  fail('Bảng chuẩn trong CHÍNH script này sai — không đủ 64 mã phân biệt.');
  process.exit(1);
}

const src = readFileSync(new URL(FILE, `file://${ROOT}`), 'utf8');
const rows = [...src.matchAll(/\{n:'([^']*)',zh:'([^']*)',li:'([01]{6})'/g)].map((m) => ({
  name: m[1],
  zh: m[2],
  li: m[3],
}));

if (rows.length !== 64) {
  fail(`${FILE}: đọc được ${rows.length} quẻ, phải đúng 64.`);
  process.exit(1);
}

const byLi = new Map(canon.map((c) => [c.li, c.name]));
let bad = 0;

rows.forEach((row, i) => {
  const want = canon[i];
  if (row.name !== want.name) {
    fail(`#${i + 1} tên lệch thứ tự King Wen: file "${row.name}" — phải là "${want.name}".`);
    bad++;
    return;
  }
  if (row.li !== want.li) {
    const impostor = byLi.get(row.li) || 'không phải quẻ nào';
    const reversed = row.li === want.li.split('').reverse().join('');
    fail(
      `#${i + 1} ${row.name} (${row.zh}): li='${row.li}' là mã của "${impostor}"` +
        ` — phải là '${want.li}'${reversed ? ' (chuỗi bị viết NGƯỢC: li khai dưới→trên)' : ''}.`
    );
    bad++;
  }
});

// Thứ tự mảng phải là King Wen vì `gridHTML` lấy ký tự Unicode quẻ bằng
// U+4DC0 + index — sai thứ tự thì tên đúng mà hình quẻ vẽ ra là quẻ khác.
const dup = new Map();
rows.forEach((r) => dup.set(r.li, [...(dup.get(r.li) || []), r.name]));
[...dup.entries()]
  .filter(([, names]) => names.length > 1)
  .forEach(([li, names]) => {
    fail(`Mã '${li}' bị dùng cho ${names.length} quẻ: ${names.join(', ')} — tra quẻ sẽ trả sai.`);
    bad++;
  });

if (bad) {
  console.error(
    `\n${bad} lỗi trong bảng 64 quẻ — mỗi mã hào sai là một kiểu gieo trả về sai quẻ và sai lời đoán.`
  );
} else {
  console.log('✅ Bảng 64 quẻ: mã hào khớp thứ tự King Wen, không trùng, phủ đủ 64 tổ hợp.');
}
