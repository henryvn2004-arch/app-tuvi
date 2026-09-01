#!/usr/bin/env node
// scripts/oracle/report-lunar-diff.mjs
// ============================================================
// CÔNG CỤ ĐO cho P1 (chưa sửa engine) — KHÔNG phải check:* pass/fail.
//
// So `_LUNAR_TABLE` hiện tại (public/tuvi-ansao-engine.js) với oracle chạy
// theo QUY TẮC LỊCH SỬ VIỆT NAM: múi giờ tham chiếu là UTC+8 cho ngày dương
// < 1968-01-01, UTC+7 từ đó — vì Việt Nam đổi mốc này thật (xem workplan +
// nguồn: suckhoedoisong.vn, hanoimoi.vn, Tết Ất Sửu 1985 lệch TQ 1 tháng).
//
// Cần scripts/oracle/vendor/ — nếu thiếu, script tự thoát 0 kèm cảnh báo rõ
// (đây là công cụ tuỳ chọn, không gate CI).
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
  console.log('  (bỏ qua report-lunar-diff — đây là công cụ tuỳ chọn, không gate CI)');
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

const START = jdFromDate(1, 2, 1900);
const END = jdFromDate(31, 12, 2100);

let total = 0,
  nDay = 0,
  nMonth = 0,
  nYear = 0,
  nOracleZeroDay = 0;
const yearsTouched = new Set();
const zeroDayDates = [];

for (let jd = START; jd <= END; jd++) {
  const [d, m, y] = fromJd(jd);
  const b = ours.solarToLunar(d, m, y);
  if (!b) continue;
  total++;
  const tz = tzForVN(d, m, y);
  const a = O.solarToLunar(d, m, y, tz);
  if (!a) continue; // không nên xảy ra trong 1900-2100, ghi nhận nếu có
  if (a.day === 0) {
    nOracleZeroDay++;
    zeroDayDates.push(`${d}/${m}/${y}`);
    continue; // ngày rác của oracle — không tính vào so sánh
  }
  if (a.day !== b.day || a.month !== b.month || a.year !== b.year) {
    if (a.year !== b.year) nYear++;
    else if (a.month !== b.month) nMonth++;
    else nDay++;
    yearsTouched.add(y);
  }
}

const totalDiff = nDay + nMonth + nYear;
const years = [...yearsTouched].sort((x, y) => x - y);

console.log('=== Đối chiếu lịch âm: bảng hiện tại vs oracle (quy tắc lịch sử VN) ===\n');
console.log(`Tổng ngày dò (1900-02-01 → 2100-12-31): ${total}`);
console.log(`Lệch NGÀY âm  : ${nDay}`);
console.log(`Lệch THÁNG âm : ${nMonth}   ← xoay cả 12 cung`);
console.log(`Lệch NĂM âm   : ${nYear}   ← sai can chi, Cục, Lộc Tồn, Tứ Hóa`);
console.log(`Tổng lệch     : ${totalDiff} (${((totalDiff / total) * 100).toFixed(2)}%)`);
console.log(`Chạm ${years.length} năm dương, từ ${years[0]} đến ${years[years.length - 1]}`);
console.log(
  `  trước 1968: ${years.filter((y) => y < 1968).length} năm | từ 1968: ${years.filter((y) => y >= 1968).length} năm`
);

if (nOracleZeroDay) {
  console.log(
    `\n⚠ Oracle trả ngày âm = 0 (ngày rác, đã BỎ QUA khỏi so sánh) tại: ${zeroDayDates.join(', ')}`
  );
  console.log(
    '  Đây là lỗi đã biết của oracle (19/4/1939, 22/3/1947) — không dùng oracle làm trọng tài ở các ngày này.'
  );
}

console.log(
  '\n(Đây là công cụ ĐO — không sửa engine, không exit non-zero. Dùng để đối chiếu khi làm P1.)'
);
