#!/usr/bin/env node
/**
 * BỘ DÒ: mọi truy vấn CÔNG KHAI tới `khao_luan` / `master_articles` phải lọc
 * `publish_status=eq.published`.
 *
 * Vì sao cần máy canh: hai bảng đó có 12 chỗ đọc rải khắp `app/` và `lib/`
 * (trang bài, danh sách, bài liên quan, trang tác giả, gợi ý trong /la-so/*,
 * sitemap, dựng bài social, seeding). Quên MỘT chỗ thì bài đã gỡ xuống vẫn
 * hiện ra ngoài — hỏng IM LẶNG, không lỗi nào bắn ra, và chỉ lộ khi có người
 * tình cờ mở đúng URL đó.
 *
 * Chỗ ĐƯỢC PHÉP không lọc, khai kèm lý do (không phải allowlist câm):
 *   - đường ADMIN: Kho phải thấy cả bài đã gỡ, không thì gỡ xong là mất dấu.
 *   - đường CRON GHI: chính nó tạo ra bài.
 *   - đếm/thống kê nội bộ: đo kho, không phải phục vụ người đọc.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TABLES = ['khao_luan', 'master_articles'];
/** Dấu hiệu ĐÃ lọc: hằng dùng chung, hoặc chuỗi thô nếu ai đó viết tay. */
const FILTERED = /PUBLISHED_ONLY|publish_status/;

/** file → lý do được miễn. Sửa danh sách này phải kèm lý do đọc được. */
const EXEMPT = {
  'app/api/payment/route.ts': 'đường admin — Kho và dashboard phải thấy cả bài đã gỡ',
  'app/api/cron-khao-luan/route.ts': 'cron GHI — chính nó tạo ra bài',
  'app/api/cron-master-write/route.ts': 'cron GHI — chính nó tạo ra bài',
  // Kiểm trùng slug TRƯỚC khi ghi — bài đã gỡ (draft/hidden) vẫn phải tính là
  // "slug đã dùng", đúng lý do topic-topup.ts được miễn ở trên. Lọc theo
  // published ở đây sẽ SAI: cho phép ghi trùng slug với một bài đã gỡ.
  'app/api/cron-khao-luan-tamly/logic.ts': 'cron GHI — chính nó tạo ra bài',
  'app/kim-lau/route.ts': 'chỉ nhắc tên bảng trong chú thích, không truy vấn',
  'lib/ops/jobs.ts': 'sổ job — chỉ nhắc tên bảng làm nhãn',
  // Đọc TIÊU ĐỀ đã có để không giao máy viết trùng chủ đề. Bài đã gỡ xuống
  // vẫn phải tính là "đã viết rồi" — lọc nó ra là máy viết lại đúng bài vừa gỡ.
  'lib/content/topic-topup.ts': 'chống trùng chủ đề — bài đã gỡ vẫn tính là đã viết',
  'lib/content/publish-filter.ts': 'chính module định nghĩa bộ lọc',
  'scripts/check-publish-filter.mjs': 'chính bộ dò này',
};

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.next' || e.name === '.git') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|mjs|js)$/.test(e.name)) out.push(p);
  }
  return out;
}

/** Bỏ chú thích để không đếm nhầm dòng tài liệu là chỗ truy vấn. Giữ NGUYÊN
 *  số dòng (thay bằng chuỗi rỗng, không xoá) thì số dòng báo lỗi mới trỏ đúng. */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .split('\n')
    .map((l) => (/^\s*(\/\/|\*)/.test(l) ? '' : l))
    .join('\n');
}

const files = [...walk(path.join(ROOT, 'app')), ...walk(path.join(ROOT, 'lib'))];
const problems = [];
let checked = 0;

for (const abs of files) {
  const rel = path.relative(ROOT, abs).split(path.sep).join('/');
  if (EXEMPT[rel]) continue;
  const src = stripComments(fs.readFileSync(abs, 'utf8'));
  const lines = src.split('\n');

  // Nhánh "tên bảng là BIẾN" (`${spec.table}?…`) chỉ xét ở file THẬT SỰ có
  // dính hai bảng này — nếu không, nó bắt luôn mọi `${table}?` của module vô
  // can (đã kêu oan `lib/metrics/collect.ts` một lượt).
  const touchesGated = TABLES.some((t) => src.includes(t));

  lines.forEach((line, i) => {
    const viaVar = /\$\{(spec\.table|table)\}\?/.test(line);
    if (viaVar && touchesGated) {
      checked++;
      // Chấp nhận nếu file có cơ chế lọc — hoặc theo danh sách bảng, hoặc nối
      // thẳng hằng vào chính dòng đó.
      if (src.includes('PUBLISH_GATED_TABLES') || FILTERED.test(line)) return;
      problems.push({
        rel,
        line: i + 1,
        text: line.trim().slice(0, 110),
        why: 'bảng là biến, không thấy cơ chế lọc',
      });
      return;
    }
    for (const t of TABLES) {
      // Chỉ quan tâm dòng THẬT SỰ dựng một đường dẫn PostgREST tới bảng đó.
      if (!new RegExp(`(rest/v1/|/)${t}\\?`).test(line)) continue;
      checked++;
      if (!FILTERED.test(line)) {
        problems.push({
          rel,
          line: i + 1,
          text: line.trim().slice(0, 110),
          why: 'thiếu bộ lọc trạng thái',
        });
      }
      return;
    }
  });
}

if (problems.length) {
  console.error('❌ Truy vấn công khai KHÔNG lọc trạng thái xuất bản:\n');
  for (const p of problems) {
    console.error(`  ${p.rel}:${p.line}  (${p.why})`);
    console.error(`     ${p.text}\n`);
  }
  console.error('Sửa: nối `&${PUBLISHED_ONLY}` (lib/content/publish-filter.ts) vào đường dẫn.');
  console.error('Nếu chỗ đó CỐ Ý không lọc (admin / cron ghi), khai vào EXEMPT kèm lý do.');
  process.exit(1);
}

console.log(
  `✅ ${checked} truy vấn công khai đều lọc trạng thái xuất bản ` +
    `(${Object.keys(EXEMPT).length} chỗ miễn trừ có lý do).`
);
