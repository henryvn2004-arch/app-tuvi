#!/usr/bin/env node
/**
 * Trang có form sinh dựng bằng JS thì KHÔNG được có script bên thứ ba chặn
 * parse đứng trước lời gọi dựng form.
 *
 * 🔴 VÌ SAO. `TuviForm.render('tuviFormHost', …)` chạy ngay trong lúc phân tích
 * HTML — đó là điều khiến form CÓ MẶT ở lần vẽ đầu và không gây nhảy layout.
 * Một thẻ `<script src="https://…">` không `defer`/`async` đứng TRƯỚC nó thì
 * chặn parse: trình duyệt vẽ lần đầu với `#tuviFormHost` còn RỖNG, rồi mới nhét
 * form 237px vào ⇒ `.frow` bị đẩy xuống.
 *
 * Đo cục bộ, chỉ đổi mỗi thuộc tính `defer` của thẻ chart.js:
 *   app-bat-tu            CLS 0,0315 → 0
 *   app-chu-trinh-cuoc-doi     0,0238 → 0
 *   app-van-han-nam            0,0221 → 0
 *
 * ⚠️ CỐ Ý chỉ soi trang CÓ `TuviForm.render`. Script chặn parse trên trang nội
 * dung TĨNH cũng làm chậm, nhưng KHÔNG gây nhảy (đo 7 trang chart.js khác: CLS 0
 * cả khi có lẫn không có `defer`) — đòi `defer` ở đó là bộ dò kêu oan.
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
        `   ⇒ lần vẽ đầu #tuviFormHost còn rỗng, form 237px nhét vào sau đẩy .frow xuống.\n` +
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
