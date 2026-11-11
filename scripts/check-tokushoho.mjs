#!/usr/bin/env node
/**
 * Trang 特定商取引法に基づく表記 (public/tokushoho.html).
 *
 * 🔴 Trang này ship khi Henry CHƯA điền thông tin người bán (placeholder
 * `【要入力: …】`). Placeholder lọt lên Google = trang pháp lý "trống" mang tên
 * thương hiệu nằm trong kết quả tìm kiếm cho khách Nhật. Bộ dò giữ ba điều:
 *   1. còn `【要入力` ⇒ BẮT BUỘC có `<meta name="robots" content="noindex">`
 *   2. hết `【要入力` ⇒ noindex PHẢI được gỡ (điền xong mà quên gỡ = trang pháp lý
 *      không bao giờ được index, im lặng)
 *   3. đủ chín mục chuẩn của luật (mất một mục = trang không còn là bản công bố hợp lệ)
 * Đây là ba chiều của cùng một bất biến, nên đỏ ở chiều nào cũng là lỗi thật.
 */
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../public/tokushoho.html', import.meta.url), 'utf8');
// Bỏ chú thích HTML trước khi dò: chính chú thích đầu file nhắc tới cả hai chuỗi.
const body = html.replace(/<!--[\s\S]*?-->/g, '');
const todo = (body.match(/【要入力/g) || []).length;
const noindex = /<meta\s+name=["']robots["']\s+content=["'][^"']*noindex/i.test(body);

const REQUIRED = [
  '販売事業者',
  '運営責任者',
  '所在地',
  '連絡先',
  '販売価格',
  '支払方法',
  '引渡時期',
  '返品・キャンセル',
  '動作環境',
];
const missing = REQUIRED.filter((h) => !new RegExp(`<th>${h}</th>`).test(body));

const errs = [];
if (todo > 0 && !noindex) errs.push(`còn ${todo} chỗ 【要入力】 mà trang chưa noindex`);
if (todo === 0 && noindex)
  errs.push('đã điền hết 【要入力】 nhưng noindex vẫn còn — gỡ meta robots để trang được index');
if (missing.length) errs.push('thiếu mục bắt buộc: ' + missing.join(', '));

if (errs.length) {
  console.error('✗ check:tokushoho\n  - ' + errs.join('\n  - '));
  process.exit(1);
}
console.log(
  `✓ check:tokushoho — ${REQUIRED.length} mục, ${todo} chỗ chờ Henry điền, noindex=${noindex}`
);
