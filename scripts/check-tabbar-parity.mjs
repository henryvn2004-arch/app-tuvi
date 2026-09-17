#!/usr/bin/env node
/**
 * 5 nhãn của thanh tabbar dưới cùng phải GIỐNG NHAU ở hai nơi dựng riêng:
 *   - `public/shell.js` `renderTabbar()` — dùng trên toàn bộ /app/* (nền navy,
 *     nút "Trợ lý"/"Tài khoản" mở rail/sidebar).
 *   - `public/index-sample-v3.html` `.bottom-nav` — trang chủ (nền sáng, không
 *     nạp shell.js nên KHÔNG có rail/sidebar, "Trợ lý" là link tĩnh).
 *
 * 🔴 VÌ SAO. Hai nơi này chép tay độc lập, không dùng chung component (trang
 * chủ cố ý giữ HTML tĩnh vì CLS, xem docs/luat/bay.md phần CLS — JS chèn nhãn
 * sau khi tải sẽ gây chớp nhãn). Đã cắn thật 2026-09: trang chủ lệch còn
 * "Hồi nhanh"/"Thêm" trong khi shell.js đã đổi thành "Home"/"Góp Ý" — không gì
 * bắt được ngoài mắt người, và không ai soát tay mỗi lần sửa một bên.
 *
 * Bộ dò này KHÔNG hợp nhất hai nơi (kiến trúc/CLS mỗi trang khác nhau là CỐ
 * Ý) — chỉ khoá đúng 1 bất biến: THỨ TỰ + VĂN BẢN 5 nhãn phải khớp tuyệt đối.
 * Đích (href/hành vi) được phép khác nhau thật.
 *
 * Chạy: node scripts/check-tabbar-parity.mjs
 */
import { readFileSync } from 'fs';

const ROOT = new URL('..', import.meta.url).pathname;
let bad = 0;
const fail = (m) => {
  console.error('❌ ' + m);
  bad++;
};

const stripTags = (s) =>
  s
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// ── shell.js: renderTabbar() ──
const shellPath = ROOT + 'public/shell.js';
const shellSrc = readFileSync(shellPath, 'utf8');
const fnMatch = shellSrc.match(/function renderTabbar\s*\([^)]*\)\s*\{[\s\S]*?\n  \}/);
if (!fnMatch) {
  fail(
    `${shellPath}: không tìm thấy function renderTabbar() — đổi tên/cấu trúc hàm thì phải sửa lại bộ dò này.`
  );
  process.exit(1);
}
const fnBody = fnMatch[0];

const shellLabels = [];
for (const m of fnBody.matchAll(/ti\('[a-z]+'\)\s*\+\s*'([^<']+)/g)) {
  shellLabels.push({ i: m.index, text: m[1].trim() });
}
for (const m of fnBody.matchAll(/<span>([^<]+)<\/span>/g)) {
  shellLabels.push({ i: m.index, text: m[1].trim() });
}
shellLabels.sort((a, b) => a.i - b.i);
const shellNames = shellLabels.map((x) => x.text);

// ── index-sample-v3.html: .bottom-nav ──
const homePath = ROOT + 'public/index-sample-v3.html';
const homeSrc = readFileSync(homePath, 'utf8');
const navMatch = homeSrc.match(/<nav class="bottom-nav">[\s\S]*?<\/nav>/);
if (!navMatch) {
  fail(
    `${homePath}: không tìm thấy <nav class="bottom-nav"> — đổi cấu trúc thì phải sửa lại bộ dò này.`
  );
  process.exit(1);
}
const homeNames = [...navMatch[0].matchAll(/<a class="bn-item[^"]*"[^>]*>([\s\S]*?)<\/a>/g)].map(
  (m) => stripTags(m[1])
);

if (shellNames.length !== 5) {
  fail(
    `${shellPath}: renderTabbar() đang có ${shellNames.length} nhãn, cần đúng 5 — [${shellNames.join(' · ')}]`
  );
}
if (homeNames.length !== 5) {
  fail(
    `${homePath}: .bottom-nav đang có ${homeNames.length} nhãn, cần đúng 5 — [${homeNames.join(' · ')}]`
  );
}

if (!bad) {
  for (let i = 0; i < 5; i++) {
    if (shellNames[i] !== homeNames[i]) {
      fail(
        `Nhãn tabbar #${i + 1} lệch nhau: shell.js = "${shellNames[i]}" ≠ index-sample-v3.html = "${homeNames[i]}". ` +
          `Sửa cho khớp cả hai — đích (href/hành vi) được phép khác, chỉ nhãn phải giống.`
      );
    }
  }
}

if (bad) {
  console.error(
    `\n${bad} lỗi. shell.js: [${shellNames.join(' · ')}] — trang chủ: [${homeNames.join(' · ')}]`
  );
  process.exit(1);
}
console.log(
  `✅ Tabbar parity: 5 nhãn khớp giữa shell.js và trang chủ — [${shellNames.join(' · ')}]`
);
