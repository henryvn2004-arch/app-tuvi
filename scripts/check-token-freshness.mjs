#!/usr/bin/env node
/**
 * Đường TIỀN và đường HỎI không được cầm ẢNH CHỤP token.
 *
 * 🔴 Lỗi thật đã trả giá (Henry báo trên prod, tool Kỳ Môn): người ĐANG đăng
 * nhập hỏi rail thì nhận "Cần đăng nhập để hỏi trợ lý". Căn nguyên: access
 * token Supabase sống ~1 giờ, mà `saveSession()` và nhánh khôi phục của
 * `initAuth()` KHÔNG hẹn giờ xoay token — chỉ `_applySession()` có, và hàm đó
 * chỉ chạy SAU một lượt refresh. Tức phiên vừa đăng nhập không bao giờ được
 * gia hạn: mở tab quá một tiếng là mọi API trả 401 trong khi nav vẫn hiện
 * "đang đăng nhập". Nặng hơn ở paywall: `_isFreeRerunQ` fail-closed nên 401
 * đọc thành "chưa trả tiền" → người đã mua bị TÍNH TIỀN LẦN HAI.
 *
 * 🔑 `Auth.getSession()?.access_token` là một ẢNH CHỤP — nó trả token kể cả khi
 * token đã hết hạn, và không có gì báo. Cách đúng là `Auth.getFreshToken()`
 * (kiểm hạn + tự xoay + gộp các lượt gọi song song).
 *
 * ⚠️ PHẠM VI CÓ CHỦ ĐÍCH — đọc trước khi mở rộng: bộ dò CHỈ canh mấy file ở
 * `GUARDED` (đường tiền + đường hỏi + hạ tầng dùng chung). Toàn repo còn ~110
 * chỗ đọc token kiểu ảnh chụp; bắt hết là kêu oan hàng loạt rồi bị tắt đi —
 * và phần lớn trong số đó nay đã an toàn nhờ auth.js tự xoay token. Thêm file
 * vào danh sách khi vá tiếp, đừng đổi thành quét cả cây.
 */
import fs from 'node:fs';

// File nào chạm tiền hoặc chạm lượt hỏi thì phải dùng token còn hạn.
const GUARDED = [
  ['public/tuvi-paywall.js', 'trừ Lượng + phép kiểm "đã trả tiền chưa"'],
  ['public/shell.js', 'lượt hỏi rail (bị 401 là đòi đăng nhập lại)'],
  ['public/account-core.js', 'trang Tài khoản — hay để mở rất lâu'],
  ['public/tools-shared/portrait-recover.js', 'cứu bản chân dung ĐÃ TRẢ TIỀN'],
];

// Chỗ được phép đọc ảnh chụp: đường LÙI bên trong chính hàm lấy token mới
// (trình duyệt còn cache bản auth.js cũ chưa có `getFreshToken`).
const OK_FALLBACK = /getFreshToken|đường lùi|fallback|ảnh chụp/i;

const SNAPSHOT = /getSession\s*\(\s*\)\s*(\?\.|\.)\s*access_token/;

let bad = 0;
for (const [file, why] of GUARDED) {
  if (!fs.existsSync(file)) {
    console.error(`✗ ${file} không tồn tại — bộ dò hỏng chứ không phải repo sạch.`);
    process.exit(1);
  }
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((raw, i) => {
    const line = raw.replace(/\/\/.*$/, ''); // bỏ chú thích cuối dòng
    if (!SNAPSHOT.test(line)) return;
    // Cho qua nếu dòng này (hoặc 3 dòng ngay trên) nói rõ đây là đường lùi.
    const ctx = lines.slice(Math.max(0, i - 3), i + 1).join('\n');
    if (OK_FALLBACK.test(ctx)) return;
    bad++;
    console.error(`✗ ${file}:${i + 1} — ${why}\n    ${raw.trim()}`);
  });
}

// Chốt 2: auth.js phải hẹn giờ xoay token ở MỌI đường tạo phiên. Thiếu một
// đường là tái lập đúng con bug gốc, và nó hỏng im lặng sau đúng 1 giờ.
const auth = fs.readFileSync('public/auth.js', 'utf8');
for (const fn of ['_applySession', 'saveSession']) {
  const i = auth.indexOf(`function ${fn}(`);
  if (i < 0) {
    console.error(`✗ Không thấy \`${fn}\` trong auth.js — bộ dò hỏng, sửa trước khi tin.`);
    process.exit(1);
  }
  if (!/_scheduleRefresh\s*\(/.test(auth.slice(i, auth.indexOf('\n}', i)))) {
    bad++;
    console.error(
      `✗ public/auth.js — \`${fn}\` không gọi \`_scheduleRefresh\`.\n` +
        '    Phiên tạo ở đường này sẽ KHÔNG được gia hạn → hết hạn sau ~1 giờ,\n' +
        '    mọi API 401 trong khi người dùng vẫn đang đăng nhập.'
    );
  }
}
if (!/_scheduleRefresh\(s\)/.test(auth)) {
  bad++;
  console.error(
    '✗ public/auth.js — nhánh khôi phục phiên của `initAuth` không hẹn giờ xoay token.'
  );
}

if (bad) {
  console.error(
    `\n${bad} chỗ cầm token có thể đã hết hạn.\n` +
      'Dùng `await Auth.getFreshToken()` (kiểm hạn + tự xoay) thay cho\n' +
      '`Auth.getSession()?.access_token`. Xem public/tuvi-paywall.js `_freshToken()`.'
  );
  process.exit(1);
}
console.log(
  `✓ ${GUARDED.length} file đường tiền/đường hỏi dùng token còn hạn · auth.js hẹn giờ đủ 3 đường`
);
