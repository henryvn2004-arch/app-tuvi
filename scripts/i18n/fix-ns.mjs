#!/usr/bin/env node
// npm run i18n:fix-ns [-- --dry]
// Sửa các lời gọi T('js.<ns>.…') mà ns KHÔNG được nhúng ở trang dùng nó (xem ns-refs.mjs): chép khoá
// sang namespace của chính file gọi (shell.js → shellui, tuvi-paywall.js → paywall, auth.js → auth,
// tool-prices.js → prices, trang .html → namespace nội tuyến chính của trang), CHÉP KÈM bản dịch đã có
// (cùng câu gốc ⇒ cùng hash), đổi tên khoá chỉ trong file đó. Khoá cũ giữ nguyên cho nơi khác còn dùng.
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
import { unembedded, refsIn, nsOf } from './ns-refs.mjs';
import { buildZhCn } from './zhcn.mjs';

const FILE_NS = {
  'shell.js': 'shellui',
  'tuvi-paywall.js': 'paywall',
  'auth.js': 'auth',
  'tool-prices.js': 'prices',
};
function nsForHtml(f) {
  const cnt = {};
  for (const k of refsIn(fs.readFileSync(path.join(PUBLIC, f), 'utf8')))
    cnt[nsOf(k)] = (cnt[nsOf(k)] || 0) + 1;
  return Object.entries(cnt).sort((a, b) => b[1] - a[1])[0]?.[0];
}

const vi = loadVi();
const own = TRANSLATED.filter((l) => !GENERATED[l]);
const dicts = Object.fromEntries(own.map((l) => [l, loadLocale(l)]));
const plan = new Map(); // from-file → Map(oldKey → newKey)
for (const { key, from } of unembedded(PUBLIC)) {
  const ns = FILE_NS[from] || nsForHtml(from);
  if (!ns) continue;
  const m = plan.get(from) || plan.set(from, new Map()).get(from);
  if (m.has(key)) continue;
  let nk = `js.${ns}.${key.split('.').slice(2).join('.')}`;
  while (nk in vi && vi[nk] !== vi[key]) nk += 'x';
  m.set(key, nk);
}
let n = 0;
for (const [from, m] of plan) {
  const f = path.join(PUBLIC, from);
  let src = fs.readFileSync(f, 'utf8');
  for (const [ok, nk] of m) {
    console.log(`${from}: ${ok} → ${nk}`);
    vi[nk] = vi[ok];
    for (const l of own) if (dicts[l][ok]) dicts[l][nk] = { ...dicts[l][ok] };
    src = src.replace(
      new RegExp(`(\\b(?:T|_tvmbT)\\(\\s*)'${ok.replace(/\./g, '\\.')}'`, 'g'),
      `$1'${nk}'`
    );
    n++;
  }
  if (!arg('dry', false)) fs.writeFileSync(f, src);
}
if (!arg('dry', false) && n) {
  writeJson('vi.json', sortObj(vi));
  for (const l of own) writeJson(`${l}.json`, sortObj(dicts[l]));
  writeJson('zh-cn.json', sortObj(buildZhCn()));
}
console.log(`${n} khoá đổi namespace`);
