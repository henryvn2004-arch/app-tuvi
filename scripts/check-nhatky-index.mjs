#!/usr/bin/env node
/**
 * BỘ DÒ: mục lục `docs/nhat-ky/README.md` phải khai ĐỦ số mục có thật trong
 * `2026-08.md` · `2026-07.md` · `track-cu.md`.
 *
 * VÌ SAO CẦN MÁY CANH: luật ghi chép trong `CLAUDE.md` bảo "chèn mục vào
 * `<tháng>.md` RỒI thêm một dòng vào bảng README". Bước hai là bước người ta
 * quên — và quên thì KHÔNG có gì kêu, vì cả hai file vẫn hợp lệ về mặt cú
 * pháp. Đo được vào 26/08: 141 mục trong `.md` nhưng mục lục chỉ có 136 dòng,
 * tức 5 mục đã trôi mất khỏi chỗ duy nhất người ta dùng để TRA.
 *
 * Đó đúng là kiểu hỏng tệ nhất với một mục lục: nó vẫn trông đầy đủ. Người sau
 * grep không thấy thì kết luận "chưa ai làm việc này" rồi đi làm lại từ đầu —
 * thứ mà cả nếp ghi nhật ký sinh ra để tránh.
 *
 * ⚠️ CỐ Ý chỉ ĐẾM, không so nội dung. Dòng mục lục là bản viết gọn của tiêu
 * đề, chữ khác nhau hoàn toàn — so chuỗi hay đo độ trùng đều đẻ ra báo oan,
 * mà "bộ dò kêu oan là bộ dò bị tắt đi". Đếm thì chính xác tuyệt đối và vẫn
 * bắt được đúng lỗi cần bắt: quên thêm dòng.
 */
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join(process.cwd(), 'docs', 'nhat-ky');
const FILES = ['2026-08.md', '2026-07.md', 'track-cu.md'];
const problems = [];

// ── Đếm mục có thật trong từng file ─────────────────────────────────────────
const realCount = {};
for (const f of FILES) {
  const p = path.join(DIR, f);
  if (!fs.existsSync(p)) {
    // Thêm/đổi tên file nhật ký thì phải sửa FILES ở trên. Dừng hẳn thay vì
    // đếm thiếu rồi báo xanh.
    console.error(
      `❌ Không thấy ${path.relative(process.cwd(), p)} — sửa danh sách FILES trong bộ dò này.`
    );
    process.exit(1);
  }
  realCount[f] = fs
    .readFileSync(p, 'utf8')
    .split('\n')
    .filter((l) => l.startsWith('## ')).length;
}

// ── Đếm dòng mục lục, tách theo file mà dòng đó trỏ tới ─────────────────────
const readme = fs.readFileSync(path.join(DIR, 'README.md'), 'utf8');
const rowCount = Object.fromEntries(FILES.map((f) => [f, 0]));
let totalRows = 0;
let unknownFile = 0;

for (const line of readme.split('\n')) {
  const m = line.match(/^\|\s*\d+\s*\|[^|]*\|([^|]*)\|/);
  if (!m) continue;
  totalRows++;
  const f = m[1].trim().replace(/`/g, '');
  if (f in rowCount) rowCount[f]++;
  else unknownFile++;
}

for (const f of FILES) {
  if (rowCount[f] !== realCount[f]) {
    const thieu = realCount[f] - rowCount[f];
    problems.push(
      thieu > 0
        ? `${f}: có ${realCount[f]} mục nhưng mục lục chỉ khai ${rowCount[f]} — THIẾU ${thieu} dòng`
        : `${f}: mục lục khai ${rowCount[f]} dòng nhưng file chỉ có ${realCount[f]} mục — THỪA ${-thieu} dòng`
    );
  }
}
if (unknownFile) {
  problems.push(`${unknownFile} dòng mục lục trỏ tới file không nằm trong danh sách nhật ký`);
}

// ── Con số tổng ở đầu README phải khớp ──────────────────────────────────────
const realTotal = FILES.reduce((s, f) => s + realCount[f], 0);
const headline = readme.match(/^(\d+)\s+mục ghi chép/m);
if (!headline) {
  problems.push(
    'Không tìm thấy dòng "N mục ghi chép" ở đầu README — bộ dò không kiểm được con số tổng.'
  );
} else if (+headline[1] !== realTotal) {
  problems.push(`Dòng đầu README ghi ${headline[1]} mục, đếm thật được ${realTotal}`);
}

if (problems.length) {
  console.error('❌ Mục lục nhật ký KHÔNG khớp với các file nhật ký:\n');
  for (const p of problems) console.error(`  • ${p}`);
  console.error(
    '\nThêm mục vào docs/nhat-ky/<tháng>.md thì PHẢI thêm một dòng vào bảng\n' +
      'trong docs/nhat-ky/README.md, và cập nhật con số ở dòng đầu.'
  );
  process.exit(1);
}

console.log(
  `✅ Mục lục nhật ký khớp: ${realTotal} mục (` +
    FILES.map((f) => `${f} ${realCount[f]}`).join(' · ') +
    `), ${totalRows} dòng trong bảng.`
);
