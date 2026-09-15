#!/usr/bin/env node
/**
 * Mọi lượt nạp GA4 (gtag.js) · Microsoft Clarity · Meta Pixel PHẢI đứng sau
 * cờ chặn `navigator.webdriver`.
 *
 * 🔴 VÌ SAO. `playwright.yml` (full E2E) mặc định nhắm THẲNG vào
 * https://www.tuviminhbao.com PROD THẬT mỗi lần push/PR (trừ nhánh dev), và
 * `smoke-prod.yml` đo prod mỗi 6 tiếng. Thiếu cờ chặn ở một điểm nạp là mỗi
 * lượt CI đổ hàng chục phiên giả vào GA4/Clarity/Meta — landing page top biến
 * thành đúng danh sách URL trong tests/, kênh dồn hết vào Direct. Đã cắn thật:
 * `nav.js` bỏ sót GA4 tới tận 2026-09-06 trong khi `track.js` đã chặn từ lâu,
 * khiến GA4 và số nội bộ đếm hai tập khách khác nhau.
 *
 * `track.js` đã tự no-op khi `navigator.webdriver` (đây là NGUỒN DUY NHẤT xử
 * lý beacon nội bộ, không thuộc phạm vi bộ dò này) — bộ dò này canh riêng BA
 * script bên thứ ba: GA4 (`googletagmanager.com/gtag/js`), Clarity
 * (`clarity.ms/tag/`), Meta Pixel (`connect.facebook.net/.../fbevents.js`).
 *
 * Cách soát: với mỗi lần match một trong ba dấu hiệu trên, lùi lại tìm DÒNG
 * gần nhất có gọi `document.getElementById(` — đó là dòng `if` chống nạp
 * trùng bọc lấy cả khối (khuôn chung của cả 5 điểm nạp hiện có: mỗi khối mở
 * bằng `if (!document.getElementById('<id>') && !navigator.webdriver) {`).
 * Rồi đòi CHÍNH dòng đó chứa `navigator.webdriver`.
 *
 * 🪤 Hai bẫy đã tự red-team bắt được trước khi chốt cách soát này:
 *   1. Soi cả CỬA SỔ nhiều dòng thay vì đúng một dòng: comment giải thích
 *      ngay phía trên (chính nó nhắc chữ "navigator.webdriver" trong văn xuôi)
 *      làm bộ dò tự nhận vơ khi đột biến bỏ cờ nhưng để nguyên comment.
 *   2. Neo bằng regex `if\s*\(.*\)\s*\{` chung chung: khối IIFE minify của
 *      Meta Pixel có `function(){` NGAY TRONG THÂN — `)` đứng liền `{` — nên
 *      `.*` tham lam khớp nhầm dòng đó làm "dòng if", bỏ qua dòng if thật nằm
 *      xa hơn một dòng. Neo bằng `getElementById(` tránh được vì thân IIFE
 *      không gọi lại nó.
 *
 * Chạy: node scripts/check-analytics-webdriver.mjs
 */
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;

const MARKERS = [
  { ten: 'GA4 (gtag.js)', re: /googletagmanager\.com\/gtag\/js/ },
  { ten: 'Microsoft Clarity', re: /clarity\.ms\/tag\// },
  { ten: 'Meta Pixel (fbevents.js)', re: /connect\.facebook\.net\/[^'"]*fbevents\.js/ },
];

// Số dòng lùi lại tối đa để tìm khối `if` bọc lấy lượt nạp — đủ cho khuôn
// nhiều dòng hiện có (xa nhất: 4 dòng, xem public/nav.js).
const LOOKBACK = 8;

let bad = 0;
const fail = (m) => {
  console.error('❌ ' + m);
  bad++;
};

const files = [];
(function walk(d) {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) {
      if (!/node_modules/.test(e.name)) walk(p);
      continue;
    }
    if (e.name.endsWith('.html') || e.name.endsWith('.js')) files.push(p);
  }
})(join(ROOT, 'public'));

let checked = 0;
for (const p of files) {
  const s = readFileSync(p, 'utf8');
  const rel = p.slice(p.indexOf('public/'));
  const lines = s.split('\n');

  for (let i = 0; i < lines.length; i++) {
    for (const marker of MARKERS) {
      if (!marker.re.test(lines[i])) continue;
      checked++;

      let guardLine = null;
      for (let j = i; j >= Math.max(0, i - LOOKBACK); j--) {
        if (lines[j].includes('getElementById(')) {
          guardLine = lines[j];
          break;
        }
      }
      if (!guardLine || !/navigator\.webdriver/.test(guardLine)) {
        fail(
          `${rel}:${i + 1}: nạp ${marker.ten} không thấy dòng \`if (!document.getElementById(...) && !navigator.webdriver)\` bọc nó trong ${LOOKBACK} dòng liền trước — CI Playwright (chạy thẳng vào prod) sẽ đổ phiên giả vào đây.`
        );
      }
    }
  }
}

if (!checked)
  fail(
    'Không thấy trang/script nào nạp GA4/Clarity/Meta Pixel — bộ dò đang canh một thứ không còn tồn tại.'
  );
if (bad) {
  console.error(`\n${bad} lỗi trên ${checked} lượt nạp.`);
  process.exit(1);
}
console.log(
  `✅ Chặn CI khỏi GA4/Clarity/Meta Pixel: ${checked} lượt nạp, đủ cờ \`navigator.webdriver\`.`
);
