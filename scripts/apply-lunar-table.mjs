#!/usr/bin/env node
// scripts/apply-lunar-table.mjs
// ============================================================
// P1 — ghi bảng lịch âm mới (scripts/fixtures/lunar-table-new.json, sinh bởi
// gen-lunar-table.mjs) vào CẢ HAI engine, giữ nguyên định dạng gốc mỗi file:
//   • public/tuvi-ansao-engine.js       (vanilla: const _LUNAR_TABLE = [[...]];)
//   • tuvi-engine/src/lunar/convert.ts  (TS: const _LUNAR_TABLE: [n,n,n,n][] = [[...]];)
//
// KHÔNG chạy tay ngoài quy trình P1 — chỉ dùng sau khi đã soát bảng mới bằng
// scripts/oracle/* (đối chiếu 100% với oracle, trừ 4 ngày rác đã biết —
// xem docs/nhat-ky khi PR này merge).
// ============================================================
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

// ── `--extra`: bảng của các truyền thống lịch KHÁC VN (cn · kr · jp) ──────────
// Đọc scripts/fixtures/lunar-table-<lich>.json (gen-lunar-table.mjs --lich <lich>),
// MÃ HOÁ GỌN rồi ghi vào khối `<LUNAR_EXTRA>` của CẢ HAI engine. KHÔNG đụng
// `_LUNAR_TABLE` (lịch VN) — đường VN giữ nguyên từng byte.
//
// Mã hoá: `r0` = dòng đầu [ymd, tháng, nhuận, năm âm]; `c` = mỗi tháng kế tiếp
// MỘT ký tự '0'..'3' = (số ngày tháng TRƯỚC − 29) + 2·(tháng này nhuận). Tháng
// nhuận giữ số tháng; tháng thường = trước+1, qua 12 → 1 thì năm âm +1. ~2,5 KB
// một bảng thay vì ~60 KB dạng mảng. Bộ mã hoá tự giải lại và so từng dòng.
function jdOfYmd(v) {
  const y = Math.floor(v / 10000),
    m = Math.floor(v / 100) % 100,
    d = v % 100;
  const a = Math.floor((14 - m) / 12),
    yy = y + 4800 - a,
    mm = m + 12 * a - 3;
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
function ymdOfJd(jd) {
  const a = jd + 32044,
    b = Math.floor((4 * a + 3) / 146097),
    c = a - Math.floor((b * 146097) / 4);
  const d = Math.floor((4 * c + 3) / 1461),
    e = c - Math.floor((1461 * d) / 4),
    m = Math.floor((5 * e + 2) / 153);
  return (
    (b * 100 + d - 4800 + Math.floor(m / 10)) * 10000 +
    (m + 3 - 12 * Math.floor(m / 10)) * 100 +
    (e - Math.floor((153 * m + 2) / 5) + 1)
  );
}
function encodeLunarRows(rows) {
  let c = '';
  for (let i = 1; i < rows.length; i++) {
    const len = jdOfYmd(rows[i][0]) - jdOfYmd(rows[i - 1][0]);
    if (len !== 29 && len !== 30) throw new Error(`tháng dài ${len} ngày tại ${rows[i - 1][0]}`);
    c += String(len - 29 + 2 * rows[i][2]);
  }
  return { r0: rows[0], c };
}
// CÙNG thuật toán với `_decodeLunarExtra` trong hai engine — đổi một nơi phải đổi cả ba.
function decodeLunarRows(enc) {
  const rows = [enc.r0.slice()];
  let [ymd, m, , y] = enc.r0,
    jd = jdOfYmd(ymd);
  for (let i = 0; i < enc.c.length; i++) {
    const k = enc.c.charCodeAt(i) - 48;
    jd += 29 + (k & 1);
    const leap = k >> 1;
    if (!leap) {
      m = m === 12 ? 1 : m + 1;
      if (m === 1) y++;
    }
    rows.push([ymdOfJd(jd), m, leap, y]);
  }
  return rows;
}

if (process.argv.includes('--extra')) {
  const EXTRA = ['cn', 'kr', 'jp'];
  const enc = {};
  for (const l of EXTRA) {
    const rows = JSON.parse(
      readFileSync(join(ROOT, 'scripts', 'fixtures', `lunar-table-${l}.json`), 'utf-8')
    );
    enc[l] = encodeLunarRows(rows);
    if (JSON.stringify(decodeLunarRows(enc[l])) !== JSON.stringify(rows))
      throw new Error(`mã hoá bảng ${l} không giải lại được đúng — dừng, không ghi gì.`);
  }
  const block = (ind) =>
    `${ind}// <LUNAR_EXTRA> — SINH bởi \`node scripts/apply-lunar-table.mjs --extra\`, KHÔNG sửa tay.\n` +
    `${ind}// Bảng âm lịch các truyền thống KHÁC VN (cn: UTC+8 · kr: UTC+8→1911, UTC+9 từ 1912 ·\n` +
    `${ind}// jp: UTC+9), mã hoá gọn — nguồn quy tắc: scripts/lunar-lich.mjs.\n` +
    `${ind}const _LUNAR_EXTRA = ${JSON.stringify(enc)};\n` +
    `${ind}// </LUNAR_EXTRA>`;
  // Soát CẢ HAI file trước rồi mới ghi — không để một engine có bảng mới còn engine kia bảng cũ.
  const re = /\/\/ <LUNAR_EXTRA>[\s\S]*?\/\/ <\/LUNAR_EXTRA>/;
  const files = ['public/tuvi-ansao-engine.js', 'tuvi-engine/src/lunar/convert.ts'].map((rel) => {
    const src = readFileSync(join(ROOT, rel), 'utf-8');
    if (!re.test(src)) throw new Error(`${rel}: thiếu khối // <LUNAR_EXTRA> … // </LUNAR_EXTRA>`);
    return { rel, src };
  });
  for (const { rel, src } of files) {
    // replacer dạng hàm: chuỗi JSON không bị hiểu nhầm `$&`/`$1`.
    writeFileSync(
      join(ROOT, rel),
      src.replace(re, () => block(''))
    );
    console.log(`✓ Đã ghi khối _LUNAR_EXTRA vào ${rel}`);
  }
  process.exit(0);
}
const newRows = JSON.parse(
  readFileSync(join(ROOT, 'scripts', 'fixtures', 'lunar-table-new.json'), 'utf-8')
);
const newLiteral = JSON.stringify(newRows);

// ── 1. public/tuvi-ansao-engine.js (vanilla) ──────────────────
{
  const p = join(ROOT, 'public', 'tuvi-ansao-engine.js');
  let src = readFileSync(p, 'utf-8');
  const before = src;
  src = src.replace(
    /\/\/ Lookup table: \[solar_yyyymmdd, lunar_month, is_leap\(0\/1\), lunar_year\]\n\/\/ Generated from lunar-javascript, covers 1900-2100\nconst _LUNAR_TABLE = \[\[.*?\]\];/s,
    '// Lookup table: [solar_yyyymmdd, lunar_month, is_leap(0/1), lunar_year]\n' +
      '// Sinh bằng thuật toán chính xác (có hiệu chỉnh ΔT) đối chiếu với oracle\n' +
      '// "An Sao - Tử Vi Thiên Lương" + quy tắc múi giờ lịch sử VN (UTC+8 trước\n' +
      '// 1968-01-01, UTC+7 từ đó). Xem scripts/gen-lunar-table.mjs. Covers 1900-2100.\n' +
      `const _LUNAR_TABLE = ${newLiteral};`
  );
  if (src === before)
    throw new Error(
      'Không thay được _LUNAR_TABLE trong public/tuvi-ansao-engine.js — regex không khớp.'
    );
  writeFileSync(p, src);
  console.log('✓ Đã ghi public/tuvi-ansao-engine.js');
}

// ── 2. tuvi-engine/src/lunar/convert.ts ───────────────────────
{
  const p = join(ROOT, 'tuvi-engine', 'src', 'lunar', 'convert.ts');
  let src = readFileSync(p, 'utf-8');
  const before = src;
  src = src.replace(
    /\/\/ ─── Lookup table: \[solar_yyyymmdd, lunar_month, is_leap, lunar_year\] ─\n\/\/ Covers 1900-2100 \(imported from original engine\)\n\/\/ eslint-disable-next-line @typescript-eslint\/no-explicit-any\nconst _LUNAR_TABLE: \[number, number, number, number\]\[\] = \[\[.*?\]\] as \[number,number,number,number\]\[\];/s,
    '// ─── Lookup table: [solar_yyyymmdd, lunar_month, is_leap, lunar_year] ─\n' +
      '// Sinh bằng thuật toán chính xác (có hiệu chỉnh ΔT) đối chiếu với oracle\n' +
      '// "An Sao - Tử Vi Thiên Lương" + quy tắc múi giờ lịch sử VN (UTC+8 trước\n' +
      '// 1968-01-01, UTC+7 từ đó). Xem scripts/gen-lunar-table.mjs. Covers 1900-2100.\n' +
      '// eslint-disable-next-line @typescript-eslint/no-explicit-any\n' +
      `const _LUNAR_TABLE: [number, number, number, number][] = ${newLiteral} as [number,number,number,number][];`
  );
  if (src === before)
    throw new Error(
      'Không thay được _LUNAR_TABLE trong tuvi-engine/src/lunar/convert.ts — regex không khớp.'
    );
  writeFileSync(p, src);
  console.log('✓ Đã ghi tuvi-engine/src/lunar/convert.ts');
}
