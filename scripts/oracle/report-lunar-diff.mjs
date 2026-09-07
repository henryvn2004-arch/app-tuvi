#!/usr/bin/env node
// scripts/oracle/report-lunar-diff.mjs
// ============================================================
// P1 ĐÃ XONG — bây giờ là bộ dò CI thật (exit non-zero khi lệch), không còn
// là công cụ đo tuỳ chọn. `_LUNAR_TABLE` (cả `public/tuvi-ansao-engine.js`
// lẫn `tuvi-engine/src/lunar/convert.ts`) được SINH bằng chính thuật toán của
// oracle "An Sao - Tử Vi Thiên Lương" (có hiệu chỉnh ΔT) cộng quy tắc múi giờ
// lịch sử VN: UTC+8 cho ngày dương < 1968-01-01, UTC+7 từ đó — VN đổi mốc này
// thật (nguồn: suckhoedoisong.vn, hanoimoi.vn; Tết Ất Sửu 1985 lệch lịch TQ
// một tháng nguyên — 21/1/1985 chứ không phải 20/2/1985). Xem
// scripts/gen-lunar-table.mjs. Bộ dò này canh bảng KHÔNG trôi khỏi oracle nữa.
//
// Cần scripts/oracle/vendor/ — nếu thiếu, tự thoát 0 kèm cảnh báo rõ (vendor
// không commit vào một số máy/CI khác — xem README ở đó); nhưng khi có mặt,
// MỌI lệch ngoài 4 "ngày rác" đã biết của oracle đều FAIL.
// ============================================================

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

let loadOracle;
try {
  ({ loadOracle } = await import('./load.mjs'));
} catch (e) {
  console.error('✗ Không nạp được scripts/oracle/load.mjs:', e.message);
  process.exit(1);
}

let O;
try {
  O = loadOracle();
} catch (e) {
  console.log('⚠ ' + e.message);
  console.log('  (bỏ qua oracle:lunar — thiếu scripts/oracle/vendor/, không gate được ở máy này)');
  process.exit(0);
}

// ── Nạp engine hiện tại (public/tuvi-ansao-engine.js) ────────
const g = globalThis;
g.window = g;
if (!g.location) {
  g.location = {
    protocol: 'https:',
    hostname: 'tuviminhbao.com',
    href: 'https://tuviminhbao.com/',
  };
}
const engineSrc = readFileSync(join(ROOT, 'public', 'tuvi-ansao-engine.js'), 'utf-8');
const ours = new Function('window', 'globalThis', engineSrc + '\nreturn {solarToLunar};')(g, g);

// ── Julian Day helpers (độc lập, tự viết lại — không tin bên nào) ───
function jdFromDate(d, m, y) {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return (
    d +
    Math.floor((153 * mm + 2) / 5) +
    365 * yy +
    Math.floor(yy / 4) -
    Math.floor(yy / 100) +
    Math.floor(yy / 400) -
    32045
  );
}
function fromJd(jd) {
  const a = jd + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((b * 146097) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  return [
    e - Math.floor((153 * m + 2) / 5) + 1,
    m + 3 - 12 * Math.floor(m / 10),
    b * 100 + d - 4800 + Math.floor(m / 10),
  ];
}

// Quy tắc lịch sử VN: UTC+8 trước 1968-01-01, UTC+7 từ đó.
const VN_SWITCH_YMD = 19680101;
function tzForVN(d, m, y) {
  return y * 10000 + m * 100 + d < VN_SWITCH_YMD ? 8 : 7;
}

// 4 "ngày rác" đã biết của oracle: nó tự trả day:0 đúng vào ngày tháng âm mới
// bắt đầu (bug đếm ngày CỦA HỌ, không phải của bảng ta) — và vì bug đó, CẢ
// THÁNG chứa ngày rác này bị lệch 1 so với oracle (ta luôn = oracle.day + 1,
// đã verify khi sinh bảng: scripts/gen-lunar-table.mjs dùng ranh giới THÁNG,
// không dùng field day của oracle, nên bảng của ta KHÔNG kế thừa bug này).
// Liệt kê theo [năm dương, tháng dương bắt đầu ngày rác] để loại đúng phạm vi
// — không loại rộng hơn mức cần.
const KNOWN_ORACLE_DAY_BUG_MONTHS = new Set([
  '1939-3', // ngày rác 19/4/1939 → tháng 3 âm lịch 1939
  '1947-2', // ngày rác 22/3/1947 → tháng 2 nhuận âm lịch 1947
  '2054-4', // ngày rác 7/5/2054 → tháng 4 âm lịch 2054
  '2062-3', // ngày rác 9/4/2062 → tháng 3 âm lịch 2062
]);

const START = jdFromDate(1, 1, 1900);
const END = jdFromDate(31, 12, 2100);

let total = 0,
  nDay = 0,
  nMonth = 0,
  nYear = 0,
  nKnownBugSkipped = 0;
const unexpected = [];

for (let jd = START; jd <= END; jd++) {
  const [d, m, y] = fromJd(jd);
  const b = ours.solarToLunar(d, m, y);
  if (!b) continue;
  total++;
  const tz = tzForVN(d, m, y);
  const a = O.solarToLunar(d, m, y, tz);
  if (!a) continue; // không nên xảy ra trong 1900-2100

  if (a.month !== b.month || a.year !== b.year) {
    if (a.year !== b.year) nYear++;
    else nMonth++;
    if (unexpected.length < 20) {
      unexpected.push(
        `${d}/${m}/${y}: bảng=${b.day}/${b.month}/${b.year} oracle=${a.day}/${a.month}/${a.year}`
      );
    }
    continue;
  }
  if (a.day !== b.day) {
    const key = `${a.year}-${a.month}`;
    if (KNOWN_ORACLE_DAY_BUG_MONTHS.has(key) && b.day === a.day + 1) {
      nKnownBugSkipped++;
      continue;
    }
    nDay++;
    if (unexpected.length < 20) {
      unexpected.push(
        `${d}/${m}/${y}: bảng=${b.day}/${b.month}/${b.year} oracle=${a.day}/${a.month}/${a.year}`
      );
    }
  }
}

const totalUnexpected = nDay + nMonth + nYear;

console.log('=== oracle:lunar — bảng lịch âm hiện tại vs oracle (quy tắc lịch sử VN) ===\n');
console.log(`Tổng ngày dò (1900-01-01 → 2100-12-31): ${total}`);
console.log(`Đã loại (bug đếm ngày CỦA ORACLE, 4 tháng đã biết): ${nKnownBugSkipped}`);
console.log(`Lệch NGÀY (ngoài phạm vi đã biết) : ${nDay}`);
console.log(`Lệch THÁNG (xoay cả 12 cung)       : ${nMonth}`);
console.log(`Lệch NĂM (sai can chi/Cục/Lộc Tồn) : ${nYear}`);

if (totalUnexpected > 0) {
  console.error(`\n✗ oracle:lunar — ${totalUnexpected} ngày LỆCH không nằm trong phạm vi đã biết:`);
  console.error(unexpected.join('\n'));
  console.error(
    '\nBảng lịch âm đã trôi khỏi oracle — kiểm scripts/gen-lunar-table.mjs / apply-lunar-table.mjs có bị chạy lại đúng cách không.'
  );
  process.exit(1);
}
console.log(
  '\n✓ oracle:lunar — bảng lịch âm khớp 100% oracle (trừ đúng 4 tháng có bug đếm ngày của họ).'
);
