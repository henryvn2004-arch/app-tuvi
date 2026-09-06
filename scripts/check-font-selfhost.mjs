#!/usr/bin/env node
/**
 * Hai font CHỮ THÂN BÀI + TIÊU ĐỀ phải nạp từ /fonts/ của mình, KHÔNG từ
 * Google Fonts.
 *
 * 🔴 VÌ SAO. Nạp qua Google Fonts là hai vòng cross-origin (fonts.googleapis.com
 * lấy CSS → fonts.gstatic.com lấy woff2) trước khi chữ có mặt chữ đúng, nên font
 * gần như luôn về SAU lần vẽ đầu ⇒ swap ⇒ nhảy. Đo trên prod, đọc đích danh
 * `subItems[].cause` của audit `layout-shifts`:
 *   /la-so.html   0,0108  cause "Web font loaded" × 6 file `bevietnampro`
 *   /app/luan-giai 0,2364 cause "Web font loaded"  (Noto Serif, đã vá ở #703)
 *
 * Bộ dò đòi HAI thứ:
 *   1. KHÔNG trang nào nạp hai font đó từ Google Fonts nữa
 *   2. trang nào NẠP `/fonts/<font>.css` thì phải có kèm
 *      `<link rel="preload" as="font" crossorigin>` cho file 400 (thân bài)
 *
 * 🪤 CỐ Ý KHÔNG đòi "khai font-family thì phải nạp CSS". Thử luật đó thì nó
 * bắt 12 trang, mà soi ra phần lớn là KÊU OAN hoặc chuyện khác: `menh-kho.html`
 * khai `font-family:Arial,'Be Vietnam Pro'` — Arial đứng TRƯỚC, tức cố ý; 10
 * trang `tools/*` khai `'Noto Serif', serif` mà chưa bao giờ nạp font đó, là
 * tình trạng CÓ TỪ TRƯỚC bản vá này chứ không phải do nó. Trộn hai câu hỏi vào
 * một bộ dò thì bộ dò sớm muộn bị tắt. (12 trang đó đã báo lại cho Henry.)
 *
 * 🪤 `crossorigin` là BẮT BUỘC kể cả khi font CÙNG ORIGIN — font luôn được tải
 * ở chế độ CORS, thiếu thuộc tính này thì trình duyệt tải HAI lần (một cho
 * preload, một cho thật) và preload thành vô nghĩa. Hỏng câm: không lỗi, không
 * cảnh báo, chỉ là tốn gấp đôi và vẫn nhảy.
 *
 * 🪤 CỐ Ý không đòi preload cho MỌI cân nặng. Đã quét 25 trang xem chúng thật
 * sự VẼ bằng cân nặng nào: cả 25 đều dùng 400 + 600, 8 trang dùng thêm 300/500.
 * Preload đúng hai cân nặng chung đó là bảo đảm được phần lớn chữ mà không phải
 * giữ 25 danh sách khác nhau.
 *
 * Chạy: node scripts/check-font-selfhost.mjs
 */
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;

// tên font trong CSS → tên file CSS tự lưu trữ + file preload bắt buộc
const FONTS = [
  {
    ten: 'Be Vietnam Pro',
    google: /fonts\.googleapis\.com\/css2\?[^"']*family=Be\+Vietnam\+Pro/,
    css: '/fonts/be-vietnam-pro.css',
    preload: [
      '/fonts/be-vietnam-pro-vietnamese-400.woff2',
      '/fonts/be-vietnam-pro-latin-400.woff2',
    ],
  },
  {
    ten: 'Noto Serif',
    google: /fonts\.googleapis\.com\/css2\?[^"']*family=Noto\+Serif(?!\+SC)/,
    css: '/fonts/noto-serif.css',
    preload: ['/fonts/noto-serif-vietnamese-400.woff2'],
  },
];

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
    if (e.name.endsWith('.html')) files.push(p);
  }
})(join(ROOT, 'public'));

let checked = 0;
for (const p of files) {
  const s = readFileSync(p, 'utf8');
  const rel = p.slice(p.indexOf('public/'));
  for (const f of FONTS) {
    if (f.google.test(s)) {
      checked++;
      fail(
        `${rel}: còn nạp ${f.ten} từ Google Fonts — hai vòng cross-origin, font về sau lần vẽ đầu là nhảy (đo prod: 0,0108 ở /la-so.html). Dùng ${f.css}.`
      );
      continue;
    }
    // Chỉ soi tiếp trang đã CHỌN dùng bản tự lưu trữ.
    if (!s.includes(`href="${f.css}`)) continue;
    checked++;

    for (const u of f.preload) {
      const re = new RegExp(
        `<link[^>]*rel="preload"[^>]*href="${u.replace(/[/.]/g, '\\$&')}"[^>]*>`
      );
      const m = s.match(re);
      if (!m) {
        fail(
          `${rel}: thiếu <link rel="preload"> cho ${u} — font chỉ khởi hành sau khi CSS về (đo: chậm 439ms), dễ trượt lần vẽ đầu.`
        );
      } else if (!/\bcrossorigin\b/.test(m[0])) {
        fail(
          `${rel}: preload ${u} thiếu \`crossorigin\` — font luôn tải ở chế độ CORS, thiếu nó là tải HAI lần và preload thành vô nghĩa.`
        );
      }
    }
  }
}

if (!checked)
  fail('Không thấy trang nào khai hai font đó — bộ dò đang canh một thứ không còn tồn tại.');
if (bad) {
  console.error(`\n${bad} lỗi trên ${checked} lượt (trang × font).`);
  process.exit(1);
}
console.log(
  `✅ Font tự lưu trữ: ${checked} lượt (trang × font) · không trang nào còn gọi Google Fonts cho hai font đó, đủ CSS + preload crossorigin.`
);
