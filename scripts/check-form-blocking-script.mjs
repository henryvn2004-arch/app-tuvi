#!/usr/bin/env node
/**
 * Trang có form sinh dựng bằng JS thì KHÔNG được có script bên thứ ba chặn
 * parse đứng trước lời gọi dựng form.
 *
 * 🔴 VÌ SAO — và ĐÂY KHÔNG PHẢI bản vá CLS. `TuviForm.render('tuviFormHost', …)`
 * chạy ngay trong lúc phân tích HTML, nhưng chỉ SAU khi `tuvi-form.js` nạp xong.
 * Một thẻ `<script src="https://…">` không `defer`/`async` đứng TRƯỚC nó thì cắm
 * thêm hẳn một chặng mạng tới bên thứ ba vào đường tới hạn của form — đắt, và
 * không đổi lấy gì. Bộ dò này canh đúng điều đó: TỐC ĐỘ.
 *
 * ⚠️ SỬA MỘT GHI CHÉP SAI. Bản đầu của file này khai `defer` chữa được cú nhảy
 * `.frow`, kèm số "0,0315 → 0". Sai. Ship ở #708 rồi đo prod: `/app/bat-tu`
 * 0,0335 trước và sau, CÙNG node CÙNG rect. Con số cục bộ đó lớn vì container
 * chặn hẳn CDN (~12,5s timeout) chứ không phải vì `defer` — đúng loại "mốc thời
 * gian cục bộ là ảo" mà chính tôi đã ghi vào `docs/luat/bay.md` rồi vẫn tin.
 * Nguyên nhân thật là dãy script CÙNG ORIGIN (17–524KB) đứng trước
 * `tuvi-form.js`; bản vá thật là chỗ giữ `#tuviFormHost:empty`
 * (`scripts/check-form-placeholder.mjs`). Xem `docs/nhat-ky/2026-09.md` vòng 9.
 *
 * ⚠️ CỐ Ý chỉ soi trang CÓ `TuviForm.render` — trang tĩnh không có gì để chờ nên
 * đòi `defer` ở đó là bộ dò kêu oan.
 *
 * 🪤 Đừng "sửa" bằng cách gỡ thư viện: `Chart` CÓ được dùng thật, trong
 * `bat-tu-core.js` và `luan-giai-core.js`. Chúng chỉ dùng nó bên trong hàm và
 * có chốt `if (typeof Chart === 'undefined') return`, nên `defer` là đủ.
 *
 * Chạy: node scripts/check-form-blocking-script.mjs
 */
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;
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

// 🪤 Bỏ CHÚ THÍCH HTML trước khi dò — và đây không phải phòng xa suông: chú
// thích giải thích bản vá (đặt ngay TRÊN thẻ chart.js) có chứa nguyên văn chuỗi
// `TuviForm.render('tuviFormHost'`, nên `indexOf` bắt phải chú thích đó và cắt
// mất đúng đoạn chứa thẻ script ⇒ bộ dò XANH OAN. Red-team bắt được.
// Thay bằng khoảng trắng CÙNG ĐỘ DÀI để mọi chỉ số vẫn trỏ đúng file gốc.
const stripComments = (src) => src.replace(/<!--[\s\S]*?-->/g, (m) => ' '.repeat(m.length));

let checked = 0;
for (const p of files) {
  const raw = readFileSync(p, 'utf8');
  const s = stripComments(raw);
  const at = s.indexOf("TuviForm.render('tuviFormHost'");
  if (at < 0) continue;
  checked++;
  const rel = p.slice(p.indexOf('public/'));

  for (const m of s.slice(0, at).matchAll(/<script[^>]*src="https:\/\/[^"]*"[^>]*>/g)) {
    if (/\sdefer\b|\sasync\b/.test(m[0])) continue;
    const url = (m[0].match(/src="([^"]+)"/) || [])[1];
    fail(
      `${rel}: script bên thứ ba CHẶN parse đứng trước lời dựng form — ${url}\n` +
        `   ⇒ form phải chờ thêm một chặng mạng tới bên thứ ba mới dựng được.\n` +
        `   Thêm \`defer\` (đừng gỡ thư viện — Chart có được dùng thật, chỉ dùng muộn).`
    );
  }
}

if (!checked)
  fail('Không thấy trang nào gọi TuviForm.render — bộ dò đang canh một thứ không còn tồn tại.');
if (bad) {
  console.error(`\n${bad} lỗi trên ${checked} trang có form sinh.`);
  process.exit(1);
}
console.log(
  `✅ Form sinh: ${checked} trang · không trang nào có script bên thứ ba chặn parse trước lời dựng form.`
);
