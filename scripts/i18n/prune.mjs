#!/usr/bin/env node
// npm run i18n:prune [-- --dry]
// Dọn khoá MỒ CÔI sau khi gỡ/đổi chữ:
//   1. vi.json: khoá `js.*` không còn lời gọi T('…')/_tvmbT('…') hay chuỗi '…' nào trong public/ (chữ HTML
//      `data-i18n` do i18n:pages quản, không đụng).
//   2. <locale>.json: bản dịch của khoá không còn trong vi.json.
// zh-cn sinh lại từ zh-tw (OpenCC). check:i18n bỏ qua khoá mồ côi nên không dọn cũng không đỏ — đây chỉ là dọn rác.
import fs from 'node:fs';
import path from 'node:path';
import { arg, PUBLIC } from './_common.mjs';
import {
  loadVi,
  loadLocale,
  writeJson,
  sortObj,
  TRANSLATED,
  GENERATED,
} from '../../lib/i18n/dict.mjs';
import { buildZhCn } from './zhcn.mjs';

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(js|html)$/.test(e.name)) out.push(p);
  }
  return out;
}
const src = walk(PUBLIC)
  .map((f) => fs.readFileSync(f, 'utf8'))
  .join('\n');
const vi = loadVi();
const dropVi = Object.keys(vi).filter((k) => k.startsWith('js.') && !src.includes(`'${k}'`));
for (const k of dropVi) delete vi[k];
const report = { 'vi.json': dropVi.length };
const own = TRANSLATED.filter((l) => !GENERATED[l]);
const dicts = {};
for (const l of own) {
  dicts[l] = loadLocale(l);
  const drop = Object.keys(dicts[l]).filter((k) => !(k in vi));
  for (const k of drop) delete dicts[l][k];
  report[`${l}.json`] = drop.length;
}
console.log(
  'khoá mồ côi:',
  Object.entries(report)
    .map(([f, n]) => `${f} ${n}`)
    .join(' · ')
);
if (!arg('dry', false)) {
  writeJson('vi.json', sortObj(vi));
  for (const l of own) writeJson(`${l}.json`, sortObj(dicts[l]));
  writeJson('zh-cn.json', sortObj(buildZhCn()));
  console.log('Đã ghi. Chạy tiếp: npm run i18n:pages && npm run check:i18n');
}
