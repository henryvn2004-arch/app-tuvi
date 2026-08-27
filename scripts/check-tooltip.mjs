#!/usr/bin/env node
/**
 * Chặn tái phát: `shell.js` chỉ được dùng MỘT cơ chế tooltip — `data-tip` +
 * `aria-label`/`alt`, hiện qua module tooltip dùng chung (node `.tip` ở body,
 * xem khối "TOOLTIP DÙNG CHUNG" trong shell.js).
 *
 * Vì sao có bộ dò này: repo từng có HAI cơ chế song song — `title=` native
 * (không sửa được delay, không theo theme, im lặng trên chạm) và `data-tip` +
 * CSS `::after` chỉ scope cho `.ws-fab .btn` (bị mẹ `.rail{overflow:hidden}`/
 * `.sb-nav{overflow-y:auto}` xén mất nếu dùng ở rail header). Gộp về một nơi
 * xong mà lỡ tay thêm `title=` mới hoặc `data-tip` không có tên cho screen
 * reader thì lặng lẽ quay lại đúng hai bệnh cũ — không có gì báo.
 *
 * 1. `title="..."` KHÔNG được xuất hiện trong shell.js (kể cả trong chuỗi
 *    HTML dựng bằng JS) — trừ `.sb-dot` (chấm nhỏ 7px, hover không trúng nên
 *    cố ý không đổi, xem CLAUDE.md).
 * 2. Mọi `data-tip="..."` phải đi kèm `aria-label="..."` HOẶC `alt="..."`
 *    trong CÙNG thẻ mở — nếu không, node `.tip` (gắn rời ở body) không có gì
 *    buộc nó vào accessible name của phần tử cho screen reader.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const FILE = path.join(ROOT, 'public', 'shell.js');
const src = fs.readFileSync(FILE, 'utf8');
const lineAt = (idx) => src.slice(0, idx).split('\n').length;

const problems = [];

// 1. title= sống sót — trừ đúng dòng sb-dot.
for (const m of src.matchAll(/\btitle="/g)) {
  const line = lineAt(m.index);
  const lineSrc = src.split('\n')[line - 1];
  if (/sb-dot/.test(lineSrc)) continue;
  problems.push(`shell.js:${line} — còn \`title="..."\` (native), phải đổi sang \`data-tip\`.`);
}

// 2. data-tip thiếu aria-label/alt trong cùng thẻ mở. Bắt cả thẻ mở chứa
//    data-tip, kể cả khi nó bị cắt qua nhiều đoạn chuỗi JS nối bằng `+` —
//    quét trên `src` (đã là văn bản nguồn, các đoạn `'...' + '...'` nằm liền
//    nhau) nên regex phi tham lam từ `<` tới `>` đủ dùng ở 99% trường hợp.
//    setAttribute('data-tip', ...) đứng riêng (không phải thẻ mở) được xử lý
//    khác: soát cùng dòng phải có setAttribute('aria-label', ...) đi kèm.
for (const m of src.matchAll(/<[a-zA-Z][^<>]*\bdata-tip="[^"]*"[^<>]*>/g)) {
  const tag = m[0];
  if (!/\baria-label="[^"]*"/.test(tag) && !/\balt="[^"]*"/.test(tag)) {
    problems.push(
      `shell.js:${lineAt(m.index)} — \`data-tip\` thiếu \`aria-label\`/\`alt\` trong cùng thẻ: ${tag.slice(0, 80)}`
    );
  }
}
for (const m of src.matchAll(/setAttribute\('data-tip',[^)]*\)/g)) {
  const line = lineAt(m.index);
  const lineSrc = src.split('\n')[line - 1];
  // `getElementById(...)` trên cùng dòng = đang CẬP NHẬT lại một node đã
  // render sẵn (đã có aria-label từ lúc khai sinh thẻ, ở nơi khác trong
  // file) — chỉ đổi mô tả `data-tip` theo trạng thái mới, không phải khai
  // sinh thẻ mới nên không bắt kèm aria-label ở đây.
  if (/getElementById\(/.test(lineSrc)) continue;
  if (!/setAttribute\('aria-label',/.test(lineSrc)) {
    problems.push(
      `shell.js:${line} — \`setAttribute('data-tip', …)\` không có \`setAttribute('aria-label', …)\` cùng dòng.`
    );
  }
}

if (problems.length) {
  console.error('✗ Tooltip trong shell.js lệch quy ước:\n');
  for (const p of problems) console.error('  ' + p);
  console.error(
    '\nMọi nút icon-only phải hiện chữ qua `data-tip` (module tooltip dùng chung, xem khối\n' +
      '"TOOLTIP DÙNG CHUNG" trong shell.js) kèm `aria-label` (hoặc `alt` nếu là <img>) — không\n' +
      'còn dùng `title=` native, không tự viết CSS `::after` riêng cho từng cụm nút.'
  );
  process.exit(1);
}
console.log('✓ shell.js dùng đúng một cơ chế tooltip (`data-tip` + `aria-label`/`alt`)');
