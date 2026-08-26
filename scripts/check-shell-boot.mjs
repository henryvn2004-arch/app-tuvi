#!/usr/bin/env node
/**
 * Mọi TRANG SHELL phải nạp đủ bộ khung khởi động.
 *
 * Vì sao cần bộ dò: đây là lần thứ BA cùng một lớp lỗi — trang shell MỚI chép
 * từ khuôn của một trang cũ và thiếu mất một dòng của khuôn. Không lần nào có
 * lỗi bắn ra, và mỗi lần thiếu một thứ khác nhau:
 *   1. `app-cong-so` + `app-ban-do-sao` thiếu 3 thẻ nạp **Noto Serif** → mọi
 *      chỗ dùng `var(--serif)` lặng lẽ rơi về Georgia. Trang vẫn đẹp, chỉ khác
 *      chữ so với 33 trang kia — chỉ lộ khi đặt hai trang cạnh nhau.
 *   2. Bảy tool thiếu `SHELL_HISTORY`/`#shellRecent` → không có đường mở lại
 *      phiên cũ. (đã có `check:shellhistory` riêng)
 *   3. `app-gio-sinh` thiếu **`auth.js`** → `window.Auth` không tồn tại, paywall
 *      coi người ĐANG ĐĂNG NHẬP là khách và bắt đăng nhập lại. Đây là cái đắt
 *      nhất trong ba: nó chặn đúng đường trả tiền.
 *
 * 🔑 Vì sao `auth.js` phải khai TAY ở từng trang: `nav.js` ở chế độ
 * `data-icons-only` RETURN SỚM — trước cả đoạn chèn `auth.js`. Trang shell
 * không có nav bar nên luôn chạy ở chế độ đó ⇒ không ai chèn hộ.
 *
 * Luật dưới đây CHỈ gồm thứ đo được là phổ quát trên CẢ 37 trang shell.
 * ⛔ `tuvi-paywall.js` CỐ Ý không có trong danh sách: chỉ 21/37 trang nạp nó
 * (tool miễn phí không cần tường), đưa vào là bộ dò kêu oan 16 trang — mà bộ
 * dò kêu oan thì người ta tắt nó đi.
 */
import fs from 'node:fs';
import path from 'node:path';

const DIR = 'public';

/**
 * [dấu hiệu tìm trong nguồn, mô tả, hậu quả nếu thiếu]
 * Dò bằng chuỗi CON (không kèm `?v=`) để bump phiên bản asset không làm đỏ.
 */
const REQUIRED = [
  [
    'src="/auth.js',
    '<script src="/auth.js?v=2"></script>',
    'người đang đăng nhập bị bắt đăng nhập lại',
  ],
  [
    'src="/shell.js',
    '<script src="/shell.js?v=N"></script>',
    'không có sidebar, rail, lịch sử — trang trống khung',
  ],
  ['href="/shell.css', '<link rel="stylesheet" href="/shell.css?v=N">', 'mất toàn bộ bố cục 3 cột'],
  [
    'src="/nav.js',
    '<script src="/nav.js?v=N" data-icons-only></script>',
    'mọi icon rơi về emoji thô',
  ],
  [
    'Noto+Serif',
    '3 thẻ preconnect/preload font Noto Serif trong <head>',
    'chữ rơi về Georgia, lệch hẳn 36 trang kia',
  ],
];

const bad = [];
let checked = 0;

for (const f of fs.readdirSync(DIR).sort()) {
  if (!f.endsWith('.html')) continue;
  const src = fs.readFileSync(path.join(DIR, f), 'utf8');
  if (!src.includes('SHELL_ACTIVE')) continue; // không phải trang shell
  checked++;
  const missing = REQUIRED.filter(([needle]) => !src.includes(needle));
  if (missing.length) bad.push({ f, missing });
}

if (!checked) {
  console.error('✗ Không tìm thấy trang shell nào — bộ dò hỏng chứ không phải repo sạch.');
  process.exit(1);
}

if (bad.length) {
  console.error('✗ Trang shell thiếu khung khởi động:\n');
  for (const b of bad) {
    console.error('  ' + b.f);
    for (const [, what, hau] of b.missing) {
      console.error('    thiếu: ' + what);
      console.error('      → ' + hau);
    }
  }
  console.error('\nChép đủ khuôn từ một trang shell đang chạy (vd app-huong-nghiep-tre.html).');
  process.exit(1);
}

console.log(`✓ ${checked} trang shell đều nạp đủ khung khởi động (${REQUIRED.length} luật)`);
