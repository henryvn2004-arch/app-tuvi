#!/usr/bin/env node
// Văn dài theo chỉ số (W16a) — docs/i18n/QUY-UOC.md "Văn dài".
//   npm run i18n:long -- status
//   npm run i18n:long -- next --locale ja [--ns kinh-dich-hao] [--n 100]   → JSON {items:[{k,ns,vi,ctx}]} còn thiếu/cũ
//   npm run i18n:long -- save --locale ja --file lo.json                    → {"<ns>/<khoá>":"bản dịch"} (stdin cũng được)
//   npm run i18n:long -- zhcn                                               → sinh lại zh-cn từ zh-tw (OpenCC)
// `save --locale zh-tw` tự sinh lại zh-cn. KHÔNG dịch/lưu zh-cn trực tiếp.
import fs from 'node:fs';
import * as OpenCC from 'opencc-js';
import { arg, ROOT } from './_common.mjs';
import { TRANSLATED, GENERATED } from '../../lib/i18n/dict.mjs';
import { hashVi, validateTranslation, hasVietnamese } from '../../lib/i18n/core.mjs';
import {
  LONG_NS,
  LONG_COMPLETE,
  loadSources,
  readLong,
  writeLong,
  longState,
} from '../../lib/i18n/long.mjs';

const cmd = process.argv[2];
const sources = loadSources(ROOT);
const total = LONG_NS.reduce((n, ns) => n + sources[ns].length, 0);

function genZhCn() {
  const conv = OpenCC.Converter({ from: 'twp', to: 'cn' });
  let n = 0;
  for (const ns of LONG_NS) {
    const tw = readLong(ROOT, 'zh-tw', ns);
    if (!tw) continue;
    const out = {};
    for (const [k, e] of Object.entries(tw)) out[k] = { t: conv(e.t), h: e.h };
    writeLong(
      ROOT,
      'zh-cn',
      ns,
      out,
      sources[ns].map((e) => e.k)
    );
    n += Object.keys(out).length;
  }
  return n;
}

if (cmd === 'status') {
  console.log(
    `Văn dài: ${total} chuỗi · ${LONG_NS.map((ns) => `${ns} ${sources[ns].length}`).join(' · ')}`
  );
  for (const l of TRANSLATED) {
    let fresh = 0,
      stale = 0,
      missing = 0;
    for (const ns of LONG_NS) {
      const d = readLong(ROOT, l, ns);
      for (const e of sources[ns]) {
        const s = longState(e, d);
        if (s === 'fresh') fresh++;
        else if (s === 'stale') stale++;
        else missing++;
      }
    }
    console.log(
      `  ${l.padEnd(6)} đủ ${fresh} · cũ ${stale} · thiếu ${missing}${LONG_COMPLETE.includes(l) ? '  (bộ dò đòi đủ)' : ''}`
    );
  }
} else if (cmd === 'next') {
  const locale = arg('locale', '');
  if (!TRANSLATED.includes(locale) || GENERATED[locale]) {
    console.error(`Cần --locale một trong: ${TRANSLATED.filter((l) => !GENERATED[l]).join(' ')}`);
    process.exit(2);
  }
  const only = arg('ns', '');
  const n = Number(arg('n', 100)) || 100;
  const items = [];
  for (const ns of LONG_NS) {
    if (only && only !== ns) continue;
    const d = readLong(ROOT, locale, ns);
    for (const e of sources[ns])
      if (longState(e, d) !== 'fresh') items.push({ k: `${ns}/${e.k}`, vi: e.vi, ctx: e.ctx });
  }
  console.log(
    JSON.stringify({ locale, remaining: items.length, items: items.slice(0, n) }, null, 1)
  );
} else if (cmd === 'save') {
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
  let input;
  try {
    input = JSON.parse(
      fs.readFileSync(file && file !== true ? file : 0, 'utf8').replace(/^\uFEFF/, '')
    );
  } catch (e) {
    console.error('Không đọc được/JSON hỏng:', e.message);
    process.exit(2);
  }
  if (input && Array.isArray(input.items))
    input = Object.fromEntries(input.items.map((x) => [x.k, x.t]));
  const bySrc = new Map();
  for (const ns of LONG_NS) for (const e of sources[ns]) bySrc.set(`${ns}/${e.k}`, e);
  const loaded = {};
  let saved = 0,
    bad = 0;
  for (const [key, t] of Object.entries(input)) {
    const e = bySrc.get(key);
    if (!e) {
      console.error(`✗ ${key}: khoá không có trong nguồn`);
      bad++;
      continue;
    }
    let err = validateTranslation(e.vi, t, locale);
    if (!err && hasVietnamese(t)) err = 'còn chữ Việt có dấu';
    if (err) {
      console.error(`✗ ${key}: ${err}`);
      bad++;
      continue;
    }
    const ns = key.slice(0, key.indexOf('/'));
    loaded[ns] ||= readLong(ROOT, locale, ns) || {};
    loaded[ns][e.k] = { t: t.trim(), h: hashVi(e.vi) };
    saved++;
  }
  for (const [ns, d] of Object.entries(loaded))
    writeLong(
      ROOT,
      locale,
      ns,
      d,
      sources[ns].map((e) => e.k)
    );
  console.log(`Đã lưu ${saved} mục ${locale}${bad ? ` · ${bad} mục hỏng (xem trên)` : ''}`);
  if (locale === 'zh-tw') console.log(`zh-cn: sinh ${genZhCn()} mục`);
  process.exit(bad ? 1 : 0);
} else if (cmd === 'zhcn') {
  console.log(`zh-cn: sinh ${genZhCn()} mục từ zh-tw`);
} else {
  console.error(
    'Dùng: i18n:long -- status | next --locale ja [--ns x] [--n 100] | save --locale ja --file lo.json | zhcn'
  );
  process.exit(2);
}
