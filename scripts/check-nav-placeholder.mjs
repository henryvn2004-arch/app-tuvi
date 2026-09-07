#!/usr/bin/env node
/**
 * Mọi trang dựng thanh nav bằng `nav.js` phải GIỮ CHỖ 60px cho nó.
 *
 * 🔴 VÌ SAO. `nav.js` chèn `<nav class="topnav">` (cao cứng 60px) vào ĐẦU
 * `<body>` sau lần vẽ đầu. Không giữ chỗ thì mọi thứ bên dưới tụt xuống 60px:
 * 60/844 = **0,0711** — đúng con số CLS mà `/`, `/luan-giai.html`,
 * `/tu-binh.html` mang bất động qua SÁU lượt đo prod liên tiếp.
 *
 * `nav.js` đã chừa sẵn cái móc: có `#nav-ph` thì nó `replaceWith` vào đúng chỗ
 * đó thay vì chèn ở đầu body. 49 trang `tools/*` + `menh-kho.html` dùng đúng
 * khuôn này từ trước — bộ dò chỉ bắt phần còn lại theo kịp.
 *
 * 🪤 Có `#nav-ph` là CHƯA đủ: `luan-giai.html` và `nguon-du-lieu.html` từng
 * khai `<div id="nav-ph"></div>` RỖNG. Nó tránh được cú chèn-ở-đầu-body nhưng
 * vẫn cao 0px ⇒ vẫn nhảy đủ 0,0711. Chiều cao mới là thứ giữ chỗ, không phải
 * sự tồn tại của thẻ. Vì vậy bộ dò đòi cả `height:60px`.
 *
 * 🪤 Chiều cao phải là INLINE STYLE, không dựa vào class: CSS của `.topnav` do
 * chính `nav.js` bơm vào lúc chạy, tức nó cũng chưa có ở lần vẽ đầu.
 *
 * Kiểm trên MỌI trang có `<script src="/nav.js">` KHÔNG mang `data-icons-only`
 * (trang shell dùng cờ đó và nav.js return sớm, không dựng nav bar):
 *   1. có đúng MỘT `#nav-ph`
 *   2. `#nav-ph` khai `height:60px` bằng inline style
 *   3. thẻ `nav.js` nằm trong `<head>` thì PHẢI có `defer` — không thì nav.js
 *      chạy lúc `document.body` còn null và ném ngay tại `nav.js:379`
 *      (`document.body.appendChild`), trang mất sạch thanh nav VÀ không nạp
 *      `conversion.js`. `khao-luan.html` đã ở tình trạng đó.
 *
 * Chạy: node scripts/check-nav-placeholder.mjs
 */
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;
let bad = 0;
const fail = (m) => {
  console.error('❌ ' + m);
  bad++;
};

const CAO = 60; // = height của `.topnav` trong CSS mà nav.js bơm vào

const files = [];
(function walk(d) {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) {
      if (!/node_modules/.test(e.name)) walk(p);
      continue;
    }
    if (e.name.endsWith('.html')) files.push(p);
  }
})(join(ROOT, 'public'));

let checked = 0;
for (const p of files) {
  const s = readFileSync(p, 'utf8');
  const tag = s.match(/<script[^>]*src="\/nav\.js[^"]*"[^>]*>/);
  if (!tag || /data-icons-only/.test(tag[0])) continue; // không dựng nav bar
  checked++;
  const rel = p.slice(p.indexOf('public/'));

  const phs = s.match(/<div[^>]*id="nav-ph"[^>]*>/g) || [];
  if (phs.length !== 1) {
    fail(
      `${rel}: cần đúng 1 <div id="nav-ph"> — đang có ${phs.length}. Thiếu nó thì nav chèn muộn đẩy cả trang xuống ${CAO}px (CLS 0,0711).`
    );
    continue;
  }
  if (!new RegExp(`height\\s*:\\s*${CAO}px`).test(phs[0])) {
    fail(
      `${rel}: #nav-ph không khai height:${CAO}px bằng inline style — thẻ rỗng vẫn cao 0px nên VẪN nhảy đủ 0,0711.`
    );
  }

  const head = s.indexOf('</head>');
  if (head >= 0 && tag.index < head && !/\sdefer\b/.test(tag[0])) {
    fail(
      `${rel}: nạp nav.js trong <head> mà thiếu \`defer\` ⇒ document.body còn null, nav.js ném ở nav.js:379 ⇒ trang MẤT thanh nav và không nạp conversion.js.`
    );
  }
}

if (!checked)
  fail('Không thấy trang nào dựng nav bar — bộ dò đang canh một thứ không còn tồn tại.');
if (bad) {
  console.error(`\n${bad} lỗi trên ${checked} trang có thanh nav.`);
  process.exit(1);
}
console.log(
  `✅ Giữ chỗ thanh nav: ${checked} trang · mỗi trang 1 #nav-ph cao ${CAO}px, nav.js trong <head> đều có defer.`
);
