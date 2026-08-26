#!/usr/bin/env node
/**
 * Canh việc CẮM khối "Ai Sinh Cùng Ngày Với Bạn" vào các trang có form sinh.
 *
 * 🔴 VÌ SAO. Khối này là BEST-EFFORT tuyệt đối: hỏng thì `el.innerHTML=''` và
 * biến mất lặng lẽ (đúng thiết kế — nó nằm cuối bản luận người ta vừa trả tiền,
 * làm hỏng trang vì một mục phụ thì đắt hơn nhiều). Cái giá của thiết kế đó là
 * MỌI lỗi cắm sai đều IM LẶNG y hệt lỗi mạng:
 *   · gỡ mất `<div id="cnsHost">` trong một lượt sửa layout → khối không hiện
 *   · nạp `cung-ngay-sinh.js` TRƯỚC `tuvi-form.js` → `TuviForm` chưa có
 *   · xoá lời gọi `CungNgaySinh.mount(...)` → API không bao giờ được gọi
 * Không cái nào ném lỗi, không cái nào đổi màu CI. Chỉ có bộ dò mới thấy.
 *
 * Kiểm 4 thứ trên MỖI trang trong danh sách:
 *   1. có đúng MỘT `<div id="cnsHost">`
 *   2. có thẻ <script> nạp `/tools-shared/cung-ngay-sinh.js`
 *   3. thẻ đó đứng SAU `tuvi-form.js` (module đọc `TuviForm`/`window.CungNgaySinh`)
 *   4. có ít nhất một lời gọi `CungNgaySinh.mount(`
 * Và: mọi trang KHÁC có nạp `cung-ngay-sinh.js` cũng phải qua đủ 4 phép — thêm
 * trang mới mà quên một bước thì đỏ, không phải im.
 *
 * ⚠️ CỐ Ý chỉ liệt kê những trang ĐÃ cắm, không đòi mọi trang có form sinh phải
 * cắm — việc mở rộng sang các tool còn lại đang làm dần. Bộ dò đòi thứ chưa
 * quyết là bộ dò kêu oan, mà bộ dò kêu oan thì sớm muộn bị tắt.
 *
 * Chạy: node scripts/check-cns.mjs
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;
let bad = 0;
const fail = (m) => {
  console.error('❌ ' + m);
  bad++;
};

const MODULE = 'public/tools-shared/cung-ngay-sinh.js';
// Trang ĐÃ cắm khối — gỡ một dòng khỏi đây phải là quyết định có chủ ý.
const PAGES = [
  'public/luan-giai.html',
  'public/app-luan-giai.html',
  'public/tu-binh.html',
  'public/app-bat-tu.html',
];

const SRC = /<script[^>]+src="\/tools-shared\/cung-ngay-sinh\.js/;
const FORM = /<script[^>]+src="\/tuvi-form\.js/;

if (!readFileSync(join(ROOT, MODULE), 'utf-8').includes('CungNgaySinh')) {
  fail(`${MODULE} không còn export CungNgaySinh.`);
}

function check(rel) {
  const h = readFileSync(join(ROOT, rel), 'utf-8');

  const host = (h.match(/id="cnsHost"/g) || []).length;
  if (host !== 1) fail(`${rel}: có ${host} phần tử \`id="cnsHost"\` — phải đúng 1.`);

  const iSrc = h.search(SRC);
  if (iSrc < 0) {
    fail(`${rel}: không nạp /tools-shared/cung-ngay-sinh.js.`);
  } else {
    const iForm = h.search(FORM);
    // 🪤 `indexOf`/`search` trả -1 làm MỌI phép so vị trí luôn đúng — phải
    // khẳng định cái mốc CÓ TỒN TẠI trước khi so, nếu không là xanh oan.
    if (iForm < 0) fail(`${rel}: không nạp /tuvi-form.js — không có mốc để so thứ tự.`);
    else if (iSrc < iForm) {
      fail(`${rel}: nạp cung-ngay-sinh.js TRƯỚC tuvi-form.js — phải nạp SAU.`);
    }
  }

  if (!/CungNgaySinh\.mount\s*\(/.test(h)) {
    fail(
      `${rel}: có container/script nhưng KHÔNG có lời gọi \`CungNgaySinh.mount(\` — khối sẽ rỗng mãi.`
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
  ['gỡ container', real.replace('id="cnsHost"', 'id="cnsHostX"'), /id="cnsHost"/],
  [
    'gỡ lời gọi mount',
    real.replace(/CungNgaySinh\.mount\s*\(/g, 'CungNgaySinhX.mount('),
    /CungNgaySinh\.mount\s*\(/,
  ],
];
for (const [ten, m, pat] of mutants) {
  if (m === real) fail(`RED-TEAM HỎNG: đột biến "${ten}" KHÔNG ăn — phép đo vô nghĩa.`);
  else if (pat.test(m))
    fail(`RED-TEAM THẤT BẠI: mẫu vẫn khớp sau đột biến "${ten}" — bộ dò không có răng.`);
  else console.log(`   ↳ red-team: "${ten}" bị bắt ✓`);
}
// Thứ tự script: dựng bản đảo ngược rồi xác nhận phép so bắt được.
const swapped =
  'x<script src="/tools-shared/cung-ngay-sinh.js"></script>y<script src="/tuvi-form.js"></script>z';
if (!(
  swapped.search(SRC) >= 0 &&
  swapped.search(FORM) >= 0 &&
  swapped.search(SRC) < swapped.search(FORM)
)) {
  fail('RED-TEAM THẤT BẠI: phép so thứ tự script KHÔNG bắt được bản đảo ngược.');
} else {
  console.log('   ↳ red-team: "nạp sai thứ tự" bị bắt ✓');
}

if (bad === 0) {
  console.log(
    `✅ Khối "Ai Sinh Cùng Ngày" cắm đúng trên ${PAGES.length + extra.length} trang (container · script sau tuvi-form.js · có mount).`
  );
} else {
  console.error(
    `\n${bad} lỗi — khối best-effort này hỏng IM LẶNG y hệt lỗi mạng, không có gì khác báo cho bạn.`
  );
  process.exitCode = 1;
}
