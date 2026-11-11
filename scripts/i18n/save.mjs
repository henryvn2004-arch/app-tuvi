#!/usr/bin/env node
// npm run i18n:save -- --locale ja --file lo.json   (hoặc đọc stdin)
// Nhận {"khoá":"bản dịch"} hoặc [{"k":..,"t":..,"same":true?}] (same = tên riêng giữ nguyên); KIỂM rồi mới ghi i18n/<locale>.json
// kèm hash câu gốc. Lô có câu hỏng: các câu tốt VẪN được lưu, câu hỏng in lý do, exit 1.
import fs from 'node:fs';
import { arg } from './_common.mjs';
import {
  loadVi,
  loadLocale,
  writeJson,
  sortObj,
  TRANSLATED,
  GENERATED,
} from '../../lib/i18n/dict.mjs';
import { hashVi, validateTranslation } from '../../lib/i18n/core.mjs';
import { generateZhCn } from './zhcn.mjs';
import { regen } from './pages.mjs';

const locale = arg('locale', '');
if (!TRANSLATED.includes(locale) || GENERATED[locale]) {
  console.error(
    GENERATED[locale]
      ? `${locale} được SINH từ ${GENERATED[locale]} — không lưu trực tiếp.`
      : `Cần --locale một trong: ${TRANSLATED.filter((l) => !GENERATED[l]).join(' ')}`
  );
  process.exit(2);
}
const file = arg('file', '');
let raw;
try {
  raw = file && file !== true ? fs.readFileSync(file, 'utf8') : fs.readFileSync(0, 'utf8');
} catch (e) {
  console.error('Không đọc được đầu vào:', e.message);
  process.exit(2);
}
let input;
try {
  input = JSON.parse(raw.replace(/^\uFEFF/, ''));
} catch (e) {
  console.error('JSON hỏng:', e.message);
  process.exit(2);
}
if (!Array.isArray(input) && input && Array.isArray(input.items)) input = input.items; // dán nguyên đầu ra i18n:next
const sameKeys = new Set();
const pairs = Array.isArray(input)
  ? input.map((x) => {
      if (x.same) sameKeys.add(x.k); // tên riêng / thương hiệu / email giữ nguyên bản gốc
      return [x.k, x.t ?? x.translation];
    })
  : Object.entries(input);

const vi = loadVi();
const dict = loadLocale(locale);
let saved = 0;
const rejects = [];
for (const [k, t] of pairs) {
  if (!(k in vi)) {
    rejects.push(`${k}: khoá không có trong vi.json`);
    continue;
  }
  const err = validateTranslation(vi[k], t, locale, { same: sameKeys.has(k) });
  if (err) {
    rejects.push(`${k}: ${err}`);
    continue;
  }
  dict[k] = { t: t.trim(), h: hashVi(vi[k]) };
  saved++;
}
writeJson(`${locale}.json`, sortObj(dict));
if (locale === 'zh-tw') generateZhCn();
const { avail } = await regen();
console.log(
  `${locale}: lưu ${saved}/${pairs.length} khoá${locale === 'zh-tw' ? ' · đã sinh lại zh-cn' : ''} · ${Object.keys(avail).length} trang có bản dịch đủ`
);
for (const r of rejects.slice(0, 25)) console.log('  ✗ ' + r);
if (rejects.length > 25) console.log(`  … và ${rejects.length - 25} câu nữa`);
process.exit(rejects.length ? 1 : 0);
