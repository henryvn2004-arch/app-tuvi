#!/usr/bin/env node
// ============================================================
// Bộ dò: mọi lượt GET tới Supabase phải khai `cache: 'no-store'`.
//
// VÌ SAO CẦN MỘT BỘ DÒ chứ không chỉ sửa một lượt: Next bọc `fetch` TOÀN CỤC và
// nhớ kết quả — kể cả trong route `dynamic = 'force-dynamic'`. Bug đó đã cắn ba
// lần ở repo này, lần nào cũng IM LẶNG và mỗi lần một chỗ khác:
//   • `/ket-qua/[id]` trả bản đã gỡ (#314);
//   • bộ giám sát báo "job CHƯA HỀ chạy" trong khi nó vừa chạy 3 lượt (30/07);
//   • `hasSlugAccess` trả bản rỗng ngay sau khi vừa trừ tiền → 402, người dùng
//     bấm lại và bị trừ LẦN HAI (#430).
// Sửa từng chỗ một thì lần sau lại có chỗ mới. Đây là cái lưới.
//
// ⚠️ MIỄN TRỪ CÓ CHỦ ĐÍCH — các route dưới đây tự đặt `s-maxage` cho CDN, tức
// cache ở đó là TÍNH NĂNG chứ không phải lỗi. Thêm route vào đây thì phải kèm
// lý do, và lý do phải là "bản cũ vài phút vẫn đúng".
// ============================================================

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DIRS = ['lib', 'app'];
const MIEN_TRU = new Set([
  'app/api/sitemap/route.ts', // sitemap: s-maxage + stale-while-revalidate
  'app/api/tu-vi/route.ts', // trang SEO: s-maxage=86400
  'app/api/khao-luan/route.ts', // trang SEO: s-maxage=86400
]);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}

/** Cắt trọn lời gọi `fetch(...)` bắt đầu tại `i` (dấu mở ngoặc). */
function blockAt(s, i) {
  let d = 0;
  for (let k = i; k < s.length; k++) {
    if (s[k] === '(') d++;
    else if (s[k] === ')' && --d === 0) return s.slice(i, k + 1);
  }
  return null;
}

const loi = [];
for (const d of DIRS) {
  if (!fs.existsSync(path.join(ROOT, d))) continue;
  for (const file of walk(path.join(ROOT, d))) {
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    if (MIEN_TRU.has(rel)) continue;
    const s = fs.readFileSync(file, 'utf8');
    for (const m of s.matchAll(/fetch\(/g)) {
      const blk = blockAt(s, m.index + m[0].length - 1);
      if (!blk) continue;
      if (!/SUPABASE_URL|supabaseUrl/.test(blk)) continue;
      if (!blk.includes('/rest/v1') && !blk.includes('/auth/v1')) continue;
      const mm = blk.match(/method:\s*'(\w+)'/);
      if (mm && mm[1].toUpperCase() !== 'GET') continue;
      // Tuỳ chọn có thể nằm trong một hằng số dùng chung (vd `SB_FRESH`) — chấp
      // nhận khi hằng đó khai `no-store` ở đâu đó trong CHÍNH file này.
      if (blk.includes('no-store')) continue;
      const bien = blk.match(/,\s*([A-Z_][A-Z0-9_]*)\s*[,)]/);
      if (bien && new RegExp(`${bien[1]}\\s*=[^;]*no-store`).test(s)) continue;
      loi.push(`${rel}:${s.slice(0, m.index).split('\n').length}`);
    }
  }
}

if (loi.length) {
  console.error(`✗ ${loi.length} lượt GET Supabase THIẾU cache: 'no-store':\n`);
  for (const l of loi) console.error('   ' + l);
  console.error(
    '\nNext nhớ lại phản hồi ⇒ phiên đã huỷ vẫn qua cửa, số dư/quota/cấu hình đọc ra bản cũ.\n' +
      "Thêm `cache: 'no-store'` vào lượt fetch đó, hoặc khai miễn trừ kèm lý do trong scripts/check-supabase-no-store.mjs."
  );
  process.exit(1);
}
console.log('✓ mọi lượt GET Supabase đều có no-store');
