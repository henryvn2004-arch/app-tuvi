#!/usr/bin/env node
/**
 * Mọi lời gọi `Auth.<gì đó>` phải khớp API THẬT mà `public/auth.js` khai.
 *
 * Vì sao cần bộ dò: gõ nhầm tên hàm trên một object toàn cục **không ném lỗi** —
 * nó trả `undefined`, và nếu chỗ gọi có bọc `Auth.foo && Auth.foo()` thì hỏng
 * hoàn toàn IM LẶNG.
 *
 * 🔴 Lỗi thật đã trả giá: `app-gio-sinh` viết
 *     const tok = (window.Auth && Auth.getToken && Auth.getToken()) || '';
 * mà API thật là `getSession()`. Kết quả: `tok` rỗng → không có header
 * Authorization → server trả **401 SAU KHI client đã trừ Lượng**. Người dùng
 * mất tiền và không nhận được gì. Không có lỗi JS nào, không có cảnh báo nào.
 *
 * 🔑 Chú ý: chỗ gọi ĐÃ CÓ `Auth.getToken &&` bọc — tức "bọc cho an toàn" KHÔNG
 * cứu được lớp lỗi này, nó chỉ đổi một tiếng nổ thành một lỗi câm. Vì thế bộ
 * dò báo MỌI tên lạ, không tha cho lời gọi có bọc.
 */
import fs from 'node:fs';
import path from 'node:path';

const AUTH_FILE = 'public/auth.js';
const ROOT = 'public';

// ── Đọc API thật từ khối `window.Auth = { ... }` ─────────────
const authSrc = fs.readFileSync(AUTH_FILE, 'utf8');
const block = /window\.Auth\s*=\s*\{([\s\S]*?)\n\};/.exec(authSrc);
if (!block) {
  console.error(
    `✗ Không tìm thấy khối \`window.Auth = { … };\` trong ${AUTH_FILE}.\n` +
      '  Bộ dò hỏng chứ không phải repo sạch — sửa regex trước khi tin kết quả.'
  );
  process.exit(1);
}
const API = new Set([...block[1].matchAll(/^\s{2}([a-zA-Z_$][\w$]*)\s*:/gm)].map((m) => m[1]));
if (API.size < 4) {
  console.error(`✗ Chỉ đọc ra ${API.size} hàm trong API Auth — nghi bộ dò đọc hụt. Dừng.`);
  process.exit(1);
}

/**
 * Tên CỐ Ý bỏ qua. Phải kèm LÝ DO, không phải danh sách câm.
 */
const EXEMPT = {
  onAuthChange:
    'NỢ CÓ SẴN, không phải lỗi mới: `tuvi-chat.html` và `referral.js` gọi nó ' +
    'nhưng auth.js chưa bao giờ khai. Cả hai chỗ đều bọc `if (Auth.onAuthChange)` ' +
    'nên không vỡ — chúng chỉ lặng lẽ KHÔNG BAO GIỜ chạy. Đáng vá riêng (một ' +
    'nhánh đăng ký referral đang chết), nhưng vá ở đây là trộn việc.',
};

/**
 * Cắt chú thích TRƯỚC khi quét, GIỮ NGUYÊN số dòng (thay bằng đúng ngần ấy
 * `\n`) để số dòng báo lỗi còn trỏ đúng chỗ.
 *
 * 🪤 Bắt buộc, và lượt chạy đầu đã chứng minh: bộ dò kêu oan vào CHÍNH câu chú
 * thích tôi viết để cảnh báo về `Auth.getToken`. Bộ dò kêu oan là bộ dò bị tắt đi.
 *
 * ⚠️ Chỉ cắt `//` khi nó ĐỨNG ĐẦU dòng (sau khoảng trắng) — cắt giữa dòng sẽ
 * nuốt luôn `https://…` rồi ăn mất phần mã nằm sau nó.
 */
function stripComments(src) {
  const keepLines = (m) => '\n'.repeat((m.match(/\n/g) || []).length);
  return src
    .replace(/<!--[\s\S]*?-->/g, keepLines)
    .replace(/\/\*[\s\S]*?\*\//g, keepLines)
    .replace(/^[ \t]*\/\/.*$/gm, '');
}

const bad = [];
let scanned = 0;

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      walk(p);
      continue;
    }
    if (!/\.(html|js)$/.test(e.name)) continue;
    if (p === AUTH_FILE) continue; // chính nó định nghĩa API
    scanned++;
    const src = stripComments(fs.readFileSync(p, 'utf8'));
    src.split('\n').forEach((line, i) => {
      for (const m of line.matchAll(/\bAuth\.([a-zA-Z_$][\w$]*)/g)) {
        const name = m[1];
        if (API.has(name) || EXEMPT[name]) continue;
        bad.push({ file: p, line: i + 1, name });
      }
    });
  }
}
walk(ROOT);

if (bad.length) {
  console.error('✗ Gọi hàm KHÔNG TỒN TẠI trên `window.Auth`:\n');
  for (const b of bad) console.error(`  ${b.file}:${b.line} → Auth.${b.name}`);
  console.error('\nAPI thật: ' + [...API].sort().join(' · '));
  console.error(
    '\nGõ nhầm tên KHÔNG ném lỗi — nó trả undefined và hỏng im lặng. Lấy token\n' +
      'thì dùng `Auth.getSession()?.access_token`, đừng bịa `Auth.getToken()`.'
  );
  process.exit(1);
}

console.log(`✓ ${scanned} file · mọi lời gọi Auth.* khớp API (${API.size} hàm)`);
