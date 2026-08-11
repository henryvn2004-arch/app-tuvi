#!/usr/bin/env node
/**
 * BỘ DÒ: sổ job (`lib/ops/jobs.ts`) · lịch chạy (`vercel.json`) · route thật
 * trên đĩa — ba thứ phải khớp nhau.
 *
 * VÌ SAO CẦN MÁY CANH: lớp lỗi này đã tái phát BA LẦN, mỗi lần ở một tầng:
 *   1. sổ job nằm trong `public/admin.html` khai 5 job trong khi `vercel.json`
 *      có 9 ⇒ CMO Digest chết 14 ngày không ai thấy (nó chưa bao giờ có mặt
 *      trên trang giám sát để mà nhìn). Vá bằng cách dời sổ về server.
 *   2. bảng `CRON_TRIGGERS` trong `app/api/payment/route.ts` cũng chỉ có 5 mục
 *      ⇒ nút "Chạy ngay" của 5 job mới không hoạt động. Vá bằng cách CHÉP TAY
 *      cho khớp — và chú thích tại chỗ ghi rõ đây là "trôi lệch giữa hai danh
 *      sách chép tay".
 *   3. tới 11/08 sổ khai 20 job có nút, bảng kia biết 11 ⇒ 9 job trả về
 *      "Unknown job". Đúng lỗi số 2, đúng chỗ, vá bằng chép tay nên trôi lại.
 *
 * Nay đường dẫn nằm TRONG sổ nên tầng 2/3 hết cửa. Bộ dò này canh phần còn
 * lại: sổ ↔ vercel.json ↔ file route. Cả ba đều hỏng IM LẶNG — job không có
 * trong sổ thì không cảnh báo nào chạm tới nó, đường dẫn sai thì nút bấm ra
 * lỗi, khai trong sổ mà quên xếp lịch thì nó vĩnh viễn "quá hạn".
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const problems = [];

// ── Đọc mảng JOBS mà KHÔNG cần tsc ──────────────────────────────────────────
// Cắt đúng khối khai báo rồi eval. Không khớp mẫu thì DỪNG HẲN kèm lời nhắc —
// đọc ra danh sách rỗng rồi báo xanh còn tệ hơn đỏ (bài học `check:motifs`).
const src = fs.readFileSync(path.join(ROOT, 'lib/ops/jobs.ts'), 'utf8');
const m = src.match(/export const JOBS: JobSpec\[\] = (\[[\s\S]*?\n\]);\n/);
if (!m) {
  console.error('❌ Không cắt được mảng JOBS trong lib/ops/jobs.ts.');
  console.error('   Bố cục file đã đổi — SỬA BỘ DÒ NÀY, đừng bỏ qua.');
  process.exit(1);
}
let JOBS;
try {
  // `H`/`D` là hằng số phút khai ngay trên mảng.
  JOBS = new Function('H', 'D', `return ${m[1]};`)(60, 24 * 60);
} catch (e) {
  console.error('❌ Không eval được mảng JOBS:', e.message);
  process.exit(1);
}
if (!Array.isArray(JOBS) || JOBS.length < 10) {
  console.error(`❌ Đọc ra ${JOBS?.length} job — quá ít, gần như chắc chắn cắt hụt.`);
  process.exit(1);
}

// ── Đọc lịch cron ───────────────────────────────────────────────────────────
const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
const scheduled = new Set((vercel.crons || []).map((c) => c.path));
if (!scheduled.size) {
  console.error('❌ vercel.json không có mục `crons` nào — bố cục đã đổi, sửa bộ dò.');
  process.exit(1);
}

// ── Luật 1: khoá job không được trùng ───────────────────────────────────────
const seen = new Set();
for (const j of JOBS) {
  if (seen.has(j.key)) problems.push(`khoá job trùng: '${j.key}'`);
  seen.add(j.key);
}

// ── Luật 2: có `path` thì file route phải TỒN TẠI ───────────────────────────
// Đây là thứ trả về "Unknown job" hoặc 404 khi bấm — sai một ký tự là nút chết
// mà không có gì báo cho tới lúc có người bấm.
for (const j of JOBS) {
  if (!j.path) continue;
  const dir = path.join(ROOT, 'app', j.path.replace(/^\/+/, ''));
  const hit = ['route.ts', 'route.tsx', 'route.js'].some((f) => fs.existsSync(path.join(dir, f)));
  if (!hit)
    problems.push(`'${j.key}': khai path '${j.path}' nhưng không có file route ở app${j.path}/`);
}

// ── Luật 3: job Vercel phải có `path`, và path đó phải được XẾP LỊCH ─────────
// Khai trong sổ mà quên thêm vào `vercel.json` thì nó không bao giờ chạy, và
// bộ dò quá-hạn sẽ kêu mãi — cảnh báo thật cho một job chưa từng được hẹn giờ.
for (const j of JOBS) {
  if (j.source !== 'vercel') continue;
  if (!j.path) {
    problems.push(`'${j.key}': source='vercel' mà không khai path ⇒ không bấm chạy tay được`);
    continue;
  }
  if (!scheduled.has(j.path)) {
    problems.push(
      `'${j.key}': path '${j.path}' KHÔNG có trong vercel.json ⇒ chưa từng được xếp lịch`
    );
  }
}

// ── Luật 4: mọi cron trong vercel.json phải có mặt trong sổ ─────────────────
// Đây chính là lỗi gốc của track S4: cron chạy thật nhưng vắng mặt trên trang
// giám sát ⇒ chết bao lâu cũng không ai biết.
const known = new Set(JOBS.filter((j) => j.path).map((j) => j.path));
for (const p of scheduled) {
  if (!known.has(p)) {
    problems.push(`vercel.json xếp lịch '${p}' nhưng KHÔNG có job nào trong sổ khai path đó`);
  }
}

// ── Luật 5: job edge phải khai tên function ────────────────────────────────
for (const j of JOBS) {
  if (j.source === 'edge' && !j.edge) {
    problems.push(`'${j.key}': source='edge' mà không khai tên edge function`);
  }
}

if (problems.length) {
  console.error('❌ Sổ job / lịch cron / route thật KHÔNG khớp:\n');
  for (const p of problems) console.error(`  • ${p}`);
  console.error('\nSửa ở lib/ops/jobs.ts (sổ) hoặc vercel.json (lịch) cho khớp nhau.');
  process.exit(1);
}

const triggerable = JOBS.filter((j) => j.path || j.edge).length;
console.log(
  `✅ ${JOBS.length} job trong sổ khớp ${scheduled.size} mục lịch cron; ` +
    `${triggerable} job bấm chạy tay được, mọi route đều tồn tại.`
);
