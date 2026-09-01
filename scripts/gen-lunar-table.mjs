#!/usr/bin/env node
// scripts/gen-lunar-table.mjs
// ============================================================
// P1 — regenerate _LUNAR_TABLE bằng thuật toán chính xác của oracle
// ("An Sao - Tử Vi Thiên Lương", có hiệu chỉnh ΔT) + quy tắc múi giờ lịch sử
// VN (UTC+8 trước 1968-01-01, UTC+7 từ đó — xem CLAUDE.md/workplan).
//
// KHÔNG ghi trực tiếp vào public/tuvi-ansao-engine.js hay
// tuvi-engine/src/lunar/convert.ts — chỉ IN ra bảng mới (JSON) để soát trước
// khi áp dụng bằng tay (apply-lunar-table.mjs).
//
// Cách hoạt động: quét TỪNG NGÀY dương từ biên dưới tới biên trên (có đệm),
// gọi oracle.solarToLunar(d,m,y,tz) mỗi ngày; mỗi khi bộ ba (tháng, nhuận,
// năm-âm) đổi so với ngày liền trước → ghi một dòng bảng mới tại ngày đó.
// oracle có 4 "ngày rác" đã biết (day:0, đúng lúc tháng mới bắt đầu — xem
// scripts/oracle/report-lunar-diff.mjs) → chuẩn hoá day:0 thành day:1 (đã
// verify: ngày liền sau luôn xác nhận đúng month/year, chỉ lệch mỗi field
// day). KHÔNG ảnh hưởng việc phát hiện chuyển tháng vì ta chỉ so (month,leap,year).
// ============================================================

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const { loadOracle } = await import('./oracle/load.mjs');
const O = loadOracle();

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
const VN_SWITCH_YMD = 19680101;
function tzForVN(d, m, y) {
  return y * 10000 + m * 100 + d < VN_SWITCH_YMD ? 8 : 7;
}
function ymd(d, m, y) {
  return y * 10000 + m * 100 + d;
}

// Đệm 2 tháng mỗi đầu để chắc chắn bắt đúng dòng bảng phủ được biên mong muốn.
const SCAN_START = jdFromDate(1, 11, 1899);
const SCAN_END = jdFromDate(28, 2, 2101);
const TARGET_MIN = 19000101; // giữ độ phủ >= bảng cũ (19000131)
const TARGET_MAX = 21001231;

const rows = [];
let prevKey = null;
let zeroDayCount = 0;
for (let jd = SCAN_START; jd <= SCAN_END; jd++) {
  const [d, m, y] = fromJd(jd);
  const tz = tzForVN(d, m, y);
  const r = O.solarToLunar(d, m, y, tz);
  if (!r) throw new Error(`oracle.solarToLunar trả falsy tại ${d}/${m}/${y}`);
  if (r.day === 0) zeroDayCount++; // ngày rác đã biết — day không dùng để phát hiện chuyển tháng
  const key = `${r.month}|${r.leap ? 1 : 0}|${r.year}`;
  if (key !== prevKey) {
    rows.push([ymd(d, m, y), r.month, r.leap ? 1 : 0, r.year]);
    prevKey = key;
  }
}
console.log(
  `Quét xong: ${rows.length} dòng chuyển tháng, ${zeroDayCount} ngày rác (đã chuẩn hoá qua phát hiện chuyển tháng).`
);

// Cắt về đúng khung mong muốn: giữ dòng cuối cùng có solar <= TARGET_MIN (để
// TARGET_MIN vẫn tra được đúng), và mọi dòng cho tới hết TARGET_MAX.
let startIdx = rows.findIndex((r) => r[0] > TARGET_MIN) - 1;
if (startIdx < 0) startIdx = 0;
let endIdx = rows.length - 1;
while (endIdx > 0 && rows[endIdx][0] > TARGET_MAX) endIdx--;
// endIdx phải là dòng CUỐI CÙNG có solar <= TARGET_MAX+dư, giữ nguyên dòng đó
// (nó cai quản mọi ngày tới trước dòng kế tiếp, bao gồm cả TARGET_MAX).
const trimmed = rows.slice(startIdx, endIdx + 1);

console.log(
  `Bảng sau khi cắt: ${trimmed.length} dòng. MIN=${trimmed[0][0]} MAX(dòng cuối)=${trimmed[trimmed.length - 1][0]}`
);
console.log(
  `(MAX thật của phạm vi phủ là ngày trước dòng-kế-tiếp-giả-định — xác nhận bằng check round-trip riêng.)`
);

const outPath = join(process.cwd(), 'scripts', 'fixtures', 'lunar-table-new.json');
writeFileSync(outPath, JSON.stringify(trimmed));
console.log(`Đã ghi ${outPath} (${trimmed.length} dòng).`);
