#!/usr/bin/env node
/**
 * Canh việc CẮM khối "Xem lá số cho người thân" vào các trang có bản luận.
 *
 * 🔴 VÌ SAO. Cùng lớp lỗi với check-cns.mjs: khối này BEST-EFFORT tuyệt đối
 * (mount() hỏng gì cũng nuốt im lặng, không dựng chứ không báo lỗi) — nên mọi
 * lỗi cắm sai đều IM LẶNG y hệt lỗi mạng:
 *   · gỡ mất `<div id="ntHost">` trong một lượt sửa layout → khối không hiện
 *   · nạp `nguoi-than.js` TRƯỚC `tuvi-form.js` → trang gọi `TuviForm.clear()`
 *     trong `onPick` khi `TuviForm` chưa có
 *   · xoá lời gọi `NguoiThan.mount(...)` → API không bao giờ được gọi
 * Không cái nào ném lỗi, không cái nào đổi màu CI. Chỉ có bộ dò mới thấy.
 *
 * Kiểm 4 thứ trên MỖI trang trong danh sách:
 *   1. có đúng MỘT `<div id="ntHost">`
 *   2. có thẻ <script> nạp `/tools-shared/nguoi-than.js`
 *   3. thẻ đó đứng SAU `tuvi-form.js`
 *   4. có ít nhất một lời gọi `NguoiThan.mount(`
 *
 * ⚠️ CỐ Ý chỉ liệt kê những trang ĐÃ cắm — mở rộng sang app-chu-trinh-cuoc-doi/
 * app-van-han-nam đang làm dần (xem workplan "Lá số cho người thứ hai").
 *
 * Chạy: node scripts/check-nguoithan.mjs
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;
let bad = 0;
const fail = (m) => {
  console.error('❌ ' + m);
  bad++;
};

const MODULE = 'public/tools-shared/nguoi-than.js';
const PAGES = ['public/app-luan-giai.html'];

const SRC = /<script[^>]+src="\/tools-shared\/nguoi-than\.js/;
const FORM = /<script[^>]+src="\/tuvi-form\.js/;

if (!readFileSync(join(ROOT, MODULE), 'utf-8').includes('NguoiThan')) {
  fail(`${MODULE} không còn export NguoiThan.`);
}

function check(rel) {
  const h = readFileSync(join(ROOT, rel), 'utf-8');

  const host = (h.match(/id="ntHost"/g) || []).length;
  if (host !== 1) fail(`${rel}: có ${host} phần tử \`id="ntHost"\` — phải đúng 1.`);

  const iSrc = h.search(SRC);
  if (iSrc < 0) {
    fail(`${rel}: không nạp /tools-shared/nguoi-than.js.`);
  } else {
    const iForm = h.search(FORM);
    if (iForm < 0) fail(`${rel}: không nạp /tuvi-form.js — không có mốc để so thứ tự.`);
    else if (iSrc < iForm) {
      fail(`${rel}: nạp nguoi-than.js TRƯỚC tuvi-form.js — phải nạp SAU.`);
    }
  }

  if (!/NguoiThan\.mount\s*\(/.test(h)) {
    fail(
      `${rel}: có container/script nhưng KHÔNG có lời gọi \`NguoiThan.mount(\` — khối sẽ rỗng mãi.`
    );
  }
}

for (const p of PAGES) check(p);

// ── Trang khác cũng nạp module thì cũng phải đủ 4 phép ───────
function htmlFiles(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) htmlFiles(p, out);
    else if (e.endsWith('.html')) out.push(p);
  }
  return out;
}
const extra = htmlFiles(join(ROOT, 'public'))
  .map((p) => p.slice(ROOT.length))
  .filter((rel) => !PAGES.includes(rel) && SRC.test(readFileSync(join(ROOT, rel), 'utf-8')));
for (const p of extra) check(p);

// ── RED-TEAM: đột biến phải BỊ BẮT, và phải xác nhận nó ĐÃ ĂN ─
const real = readFileSync(join(ROOT, PAGES[0]), 'utf-8');
const mutants = [
  ['gỡ container', real.replace('id="ntHost"', 'id="ntHostX"'), /id="ntHost"/],
  [
    'gỡ lời gọi mount',
    real.replace(/NguoiThan\.mount\s*\(/g, 'NguoiThanX.mount('),
    /NguoiThan\.mount\s*\(/,
  ],
];
for (const [ten, m, pat] of mutants) {
  if (m === real) fail(`RED-TEAM HỎNG: đột biến "${ten}" KHÔNG ăn — phép đo vô nghĩa.`);
  else if (pat.test(m))
    fail(`RED-TEAM THẤT BẠI: mẫu vẫn khớp sau đột biến "${ten}" — bộ dò không có răng.`);
  else console.log(`   ↳ red-team: "${ten}" bị bắt ✓`);
}
const swapped =
  'x<script src="/tools-shared/nguoi-than.js"></script>y<script src="/tuvi-form.js"></script>z';
if (
  !(
    swapped.search(SRC) >= 0 &&
    swapped.search(FORM) >= 0 &&
    swapped.search(SRC) < swapped.search(FORM)
  )
) {
  fail('RED-TEAM THẤT BẠI: phép so thứ tự script KHÔNG bắt được bản đảo ngược.');
} else {
  console.log('   ↳ red-team: "nạp sai thứ tự" bị bắt ✓');
}

if (bad === 0) {
  console.log(
    `✅ Khối "Xem lá số cho người thân" cắm đúng trên ${PAGES.length + extra.length} trang (container · script sau tuvi-form.js · có mount).`
  );
} else {
  console.error(
    `\n${bad} lỗi — khối best-effort này hỏng IM LẶNG y hệt lỗi mạng, không có gì khác báo cho bạn.`
  );
  process.exitCode = 1;
}
