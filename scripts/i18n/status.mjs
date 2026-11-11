#!/usr/bin/env node
// npm run i18n:status [-- --pages] — khoá thiếu/cũ theo từng ngôn ngữ (và theo trang với --pages).
import { arg } from './_common.mjs';
import {
  loadVi,
  loadLocale,
  loadPages,
  keyState,
  pageKeys,
  TRANSLATED,
  GENERATED,
} from '../../lib/i18n/dict.mjs';

const vi = loadVi();
const keys = Object.keys(vi);
console.log(`vi.json: ${keys.length} khoá\n`);
console.log('locale  fresh  stale  missing   %');
const dicts = {};
for (const l of TRANSLATED) {
  const d = (dicts[l] = loadLocale(l));
  const c = { fresh: 0, stale: 0, missing: 0 };
  for (const k of keys) c[keyState(vi, d, k)]++;
  const pct = keys.length ? Math.round((100 * (c.fresh + c.stale)) / keys.length) : 100;
  console.log(
    `${l.padEnd(7)} ${String(c.fresh).padStart(5)}  ${String(c.stale).padStart(5)}  ${String(c.missing).padStart(7)}  ${String(pct).padStart(3)}%${GENERATED[l] ? `   (sinh từ ${GENERATED[l]})` : ''}`
  );
}
if (arg('pages', false)) {
  const pages = loadPages();
  console.log(
    '\ntrang → số khoá còn THIẾU theo ngôn ngữ (0 = đã dịch đủ, trang mới vào hreflang/sitemap):'
  );
  for (const [p, page] of Object.entries(pages)) {
    const ks = pageKeys(page, vi);
    const cells = TRANSLATED.map(
      (l) => `${l}:${ks.filter((k) => keyState(vi, dicts[l], k) === 'missing').length}`
    );
    console.log(`${p.padEnd(34)} ${String(ks.length).padStart(4)} khoá  ${cells.join('  ')}`);
  }
}
