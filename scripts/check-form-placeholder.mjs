#!/usr/bin/env node
/**
 * Trang có `#tuviFormHost` phải GIỮ CHỖ cho form khai sinh.
 *
 * 🔴 VÌ SAO. `TuviForm.render('tuviFormHost', …)` chạy ngay trong lúc phân tích
 * HTML — nhưng chỉ SAU khi `tuvi-form.js` nạp xong, mà đứng trước nó là cả một
 * dãy script CÙNG ORIGIN cũng chặn parse (17KB ở `app-chan-dung-*`, 524KB ở
 * `app-luan-giai`). Trên mạng chậm, trình duyệt vẽ lần đầu với `#tuviFormHost`
 * còn RỖNG rồi ~3,5–6,5s sau mới nhét form 237–305px vào ⇒ `.frow` ngay dưới bị
 * đẩy xuống. Đo trên prod: 0,0315 (`/app/bat-tu`) · 0,0293 (`/app/luan-giai`).
 *
 * ⚠️ Vòng trước tôi quy cú này cho MỘT thẻ chart.js bên thứ ba không `defer` và
 * ship bản vá `defer` (#708). Prod KHÔNG đổi một phần nghìn nào: 0,0335 trước và
 * sau, cùng node cùng rect. Số "0,0315 → 0" đo cục bộ đó là ẢO — nó lớn vì
 * container chặn hẳn CDN (~12,5s timeout), không phải vì `defer`. Giữ chỗ mới là
 * bản vá thật. Xem `docs/nhat-ky/2026-09.md` vòng 9.
 *
 * Bộ dò đòi ba thứ, thiếu bất kỳ thứ nào là chỗ giữ VÔ HIỆU:
 *   1. có luật `#tuviFormHost:empty{min-height:Npx}` với N ≥ 200
 *      (237/239/305 tuỳ trang — số ĐO, đừng gõ ước lượng)
 *   2. luật đó nằm trong `@media (max-width:…)`. Không có media query thì màn
 *      rộng cũng giữ 237px trong khi form thật chỉ cao ~168px ⇒ form vào là
 *      khối CO LẠI, vẫn là một cú nhảy, chỉ đổi chiều.
 *   3. thẻ host phải RỖNG THẬT (`...tuviFormHost"></div>`): một dấu cách hay
 *      xuống dòng bên trong là `:empty` không khớp nữa và chỗ giữ im lặng biến
 *      mất — không lỗi, không cảnh báo, chỉ là CLS quay lại.
 *
 * 🪤 `:empty` là chủ ý: chỗ giữ TỰ NHẢ ngay khi form vào, nên đặt hụt vài px chỉ
 * tốn vài phần vạn CLS, còn `min-height` thường mà đặt DƯ thì để lại khoảng
 * trắng vĩnh viễn dưới form.
 *
 * Chạy: node scripts/check-form-placeholder.mjs
 */
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;
const TOI_THIEU = 200; // px — thấp hơn nữa thì chắc chắn không phải số đo thật

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
  if (!/id="tuviFormHost"/.test(s)) continue;
  checked++;
  const rel = p.slice(p.indexOf('public/'));

  if (!/id="tuviFormHost"><\/div>/.test(s)) {
    fail(
      `${rel}: <div id="tuviFormHost"> KHÔNG rỗng thật — chỉ một dấu cách bên trong là :empty không khớp, chỗ giữ biến mất im lặng.`
    );
  }

  const rule = s.match(/^([^\n]*#tuviFormHost:empty\s*\{[^}]*\})/m);
  if (!rule) {
    fail(
      `${rel}: thiếu luật \`#tuviFormHost:empty{min-height:…px}\` ⇒ lần vẽ đầu host cao 0px, form vào sau đẩy .frow xuống (đo prod: tới 0,0315).`
    );
    continue;
  }
  const px = (rule[1].match(/min-height\s*:\s*(\d+(?:\.\d+)?)px/) || [])[1];
  if (!px || Number(px) < TOI_THIEU) {
    fail(
      `${rel}: chỗ giữ #tuviFormHost chỉ ${px ?? 'không'}px — form compact cao 237–305px ở mobile, dưới ${TOI_THIEU}px là chưa đo.`
    );
  }
  if (!/@media[^{]*max-width/.test(rule[1])) {
    fail(
      `${rel}: luật #tuviFormHost:empty không nằm trong @media (max-width:…) — màn rộng form chỉ cao ~168px nên giữ 237px là khối CO LẠI khi form vào, vẫn nhảy.`
    );
  }
}

if (!checked)
  fail('Không thấy trang nào có #tuviFormHost — bộ dò đang canh một thứ không còn tồn tại.');
if (bad) {
  console.error(`\n${bad} lỗi trên ${checked} trang có form khai sinh.`);
  process.exit(1);
}
console.log(
  `✅ Giữ chỗ form khai sinh: ${checked} trang · mỗi trang một luật #tuviFormHost:empty ≥ ${TOI_THIEU}px trong @media max-width.`
);
