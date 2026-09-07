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
